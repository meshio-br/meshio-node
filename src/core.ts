import { randomUUID } from 'node:crypto';
import {
  ConnectionError,
  type MeshioError,
  ServerError,
  TimeoutError,
  errorFromResponse,
  parseRetryAfter,
} from './errors.js';
import { VERSION } from './version.js';

export const DEFAULT_BASE_URL = 'https://api.meshio.com.br';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 2;

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface ClientOptions {
  /** Chave `msk_live_…` ou `msk_test_…`. Padrão: variável `MESHIO_API_KEY`. */
  apiKey?: string;
  /** Padrão: `MESHIO_BASE_URL` ou `https://api.meshio.com.br`. */
  baseUrl?: string;
  /** Tempo limite por tentativa, em milissegundos (padrão 30000). */
  timeout?: number;
  /** Novas tentativas automáticas (padrão 2). */
  maxRetries?: number;
  /** Implementação de fetch (padrão: fetch global do Node 18+). */
  fetch?: FetchLike;
  /** Cabeçalhos extras enviados em todas as requisições. */
  defaultHeaders?: Record<string, string>;
}

/** Opções por chamada. */
export interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Chave de idempotência (só usada por operações que a aceitam). */
  idempotencyKey?: string;
}

export type QueryValue = string | number | boolean | null | undefined | Array<string | number>;

export interface RequestSpec {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  query?: object;
  body?: unknown;
  /** Formato da resposta. */
  responseType?: 'json' | 'text';
  /** Envia `Idempotency-Key` (gerando UUID v4 se `required` e não informado). */
  idempotency?: 'required' | 'optional';
  options?: RequestOptions;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  requestId: string | undefined;
  /** `true` quando o servidor devolveu o resultado de uma requisição anterior com a mesma chave. */
  idempotentReplay: boolean;
  idempotencyKey: string | undefined;
}

const RETRYABLE_SERVER_STATUS = new Set([500, 502, 503, 504]);

/** Códigos de erro que indicam falha ao abrir a conexão, ou seja, antes de enviar a requisição. */
const CONNECT_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
]);

/** Verdadeiro quando a falha ocorreu antes de a requisição ser enviada (nunca chegou à API). */
export function isConnectFailure(err: unknown): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur && typeof cur === 'object'; i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === 'string' && CONNECT_ERROR_CODES.has(code)) return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

function env(name: string): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return p?.env?.[name] || undefined;
}

/** UUID v4 (usa `node:crypto`, disponível no Node 18 sem flags). */
export function uuidv4(): string {
  return randomUUID();
}

/** Backoff exponencial com jitter: 0,5 s, 1 s, 2 s… (máx. 8 s). */
export function backoffMs(attempt: number): number {
  const base = Math.min(500 * 2 ** attempt, 8000);
  return Math.round(base / 2 + Math.random() * (base / 2));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  private readonly fetchImpl: FetchLike;
  private readonly defaultHeaders: Record<string, string>;
  /** Substituível em testes. */
  sleep: (ms: number) => Promise<unknown> = sleep;

  constructor(opts: ClientOptions = {}) {
    const apiKey = opts.apiKey ?? env('MESHIO_API_KEY');
    if (!apiKey) {
      throw new Error(
        'Chave de API ausente: informe `apiKey` ou defina a variável MESHIO_API_KEY.',
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = (opts.baseUrl ?? env('MESHIO_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    const f = opts.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (!f) throw new Error('fetch indisponível: use Node 18+ ou informe a opção `fetch`.');
    this.fetchImpl = f;
    this.defaultHeaders = opts.defaultHeaders ?? {};
  }

  buildUrl(path: string, query?: object): string {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query as Record<string, QueryValue>)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, String(item));
        else url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  async request<T>(spec: RequestSpec): Promise<ApiResponse<T>> {
    const options = spec.options ?? {};
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'User-Agent': `meshio-node/${VERSION}`,
      Accept: spec.responseType === 'text' ? 'text/csv, application/json' : 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    };
    let idempotencyKey: string | undefined;
    if (spec.idempotency) {
      idempotencyKey =
        options.idempotencyKey ?? (spec.idempotency === 'required' ? uuidv4() : undefined);
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    }
    let body: string | undefined;
    if (spec.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(spec.body);
    }
    const url = this.buildUrl(spec.path, spec.query);
    // Regra única de novas tentativas: 429 e falha de conexão antes do envio sempre;
    // 5xx (500/502/503/504) e timeout só em GET ou com Idempotency-Key; outros 4xx nunca.
    const retrySafe = spec.method === 'GET' || idempotencyKey !== undefined;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const timeout = options.timeout ?? this.timeout;

    for (let attempt = 0; ; attempt++) {
      const hasBudget = attempt < maxRetries;
      let response: Response;
      try {
        response = await this.fetchWithTimeout(
          url,
          { method: spec.method, headers, body },
          timeout,
          options.signal,
        );
      } catch (err) {
        const retryable = !(err instanceof AbortedByUser) && (retrySafe || isConnectFailure(err));
        if (hasBudget && retryable) {
          await this.sleep(backoffMs(attempt));
          continue;
        }
        throw toConnectionError(err, timeout);
      }

      if (response.ok) {
        const data = await readBody(response, spec.responseType);
        return {
          data: data as T,
          status: response.status,
          headers: response.headers,
          requestId: response.headers.get('x-request-id') ?? undefined,
          idempotentReplay: /^true$/i.test(response.headers.get('idempotent-replayed') ?? ''),
          idempotencyKey,
        };
      }

      const retryableStatus =
        response.status === 429 || (retrySafe && RETRYABLE_SERVER_STATUS.has(response.status));
      if (hasBudget && retryableStatus) {
        const ra = parseRetryAfter(response.headers.get('retry-after'));
        await response.arrayBuffer().catch(() => undefined);
        await this.sleep(ra !== undefined ? Math.min(ra * 1000, 60_000) : backoffMs(attempt));
        continue;
      }
      let parsed: unknown;
      try {
        const text = await response.text();
        try {
          parsed = text ? JSON.parse(text) : undefined;
        } catch {
          parsed = text;
        }
      } catch {
        parsed = undefined;
      }
      throw errorFromResponse(response.status, parsed, response.headers);
    }
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout: number,
    signal?: AbortSignal,
  ): Promise<Response> {
    if (signal?.aborted) throw new AbortedByUser();
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (timedOut) throw new TimeoutMarker();
      if (signal?.aborted) throw new AbortedByUser();
      throw err;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}

class TimeoutMarker extends Error {}
class AbortedByUser extends Error {}

function toConnectionError(err: unknown, timeout: number): MeshioError {
  if (err instanceof TimeoutMarker) {
    return new TimeoutError(`Tempo limite de ${timeout} ms esgotado.`);
  }
  if (err instanceof AbortedByUser) {
    return new ConnectionError('Requisição cancelada.');
  }
  if (err instanceof ServerError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new ConnectionError(`Falha de conexão com a API Meshio: ${msg}`, { cause: err });
}

async function readBody(response: Response, type: RequestSpec['responseType']): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (type === 'text') return text;
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
