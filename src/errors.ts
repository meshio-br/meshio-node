/** Erros do SDK. As mensagens vindas do servidor já estão em pt-BR e são repassadas sem tradução. */

export interface MeshioErrorInit {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
  headers?: Headers;
  cause?: unknown;
}

export class MeshioError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly details: Record<string, unknown>;
  readonly requestId: string | undefined;
  readonly headers: Headers | undefined;

  constructor(message: string, init: MeshioErrorInit = {}) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = new.target.name;
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? {};
    this.requestId = init.requestId;
    this.headers = init.headers;
  }
}

export class BadRequestError extends MeshioError {}
export class AuthenticationError extends MeshioError {}
export class PermissionDeniedError extends MeshioError {}
export class NotFoundError extends MeshioError {}
/** 409, inclusive `IDEMPOTENCY_CONFLICT`. */
export class ConflictError extends MeshioError {}

/** 422. `fields` traz o mapa campo → mensagem de `details.fields`. */
export class ValidationError extends MeshioError {
  readonly fields: Record<string, string>;
  constructor(message: string, init: MeshioErrorInit = {}) {
    super(message, init);
    this.fields = normalizeFields(init.details?.fields);
  }
}

export class RateLimitError extends MeshioError {
  /** Segundos indicados em `Retry-After`, se houver. */
  readonly retryAfter: number | undefined;
  constructor(message: string, init: MeshioErrorInit & { retryAfter?: number } = {}) {
    super(message, init);
    this.retryAfter = init.retryAfter;
  }
}

export class ServerError extends MeshioError {}
/** `code == "POLICY_BLOCKED"`; preserva o status HTTP original. */
export class PolicyBlockedError extends MeshioError {}
/** Falha de rede antes de obter resposta. */
export class ConnectionError extends MeshioError {}
/** Tempo limite da requisição esgotado. */
export class TimeoutError extends ConnectionError {}
/** Assinatura de webhook inválida, ausente ou fora da tolerância. */
export class WebhookVerificationError extends MeshioError {}

function normalizeFields(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const key = rec.field ?? rec.loc ?? rec.name;
        const k = Array.isArray(key) ? key.join('.') : String(key ?? '');
        if (k) out[k] = String(rec.message ?? rec.msg ?? '');
      }
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] = Array.isArray(v) ? v.map(String).join('; ') : String(v);
    }
  }
  return out;
}

export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) return n;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, (date - Date.now()) / 1000);
  return undefined;
}

/** Constrói o erro tipado a partir de uma resposta HTTP não 2xx. */
export function errorFromResponse(status: number, body: unknown, headers: Headers): MeshioError {
  const envelope = (body && typeof body === 'object' ? body : {}) as {
    error?: { code?: string; message?: string; details?: Record<string, unknown> };
    request_id?: string;
  };
  const err = envelope.error ?? {};
  const message = err.message ?? (typeof body === 'string' && body ? body : `Erro HTTP ${status}`);
  const init: MeshioErrorInit = {
    status,
    code: err.code,
    details: err.details && typeof err.details === 'object' ? err.details : {},
    requestId: headers.get('x-request-id') ?? envelope.request_id,
    headers,
  };
  if (err.code === 'POLICY_BLOCKED') return new PolicyBlockedError(message, init);
  switch (status) {
    case 400:
      return new BadRequestError(message, init);
    case 401:
      return new AuthenticationError(message, init);
    case 403:
      return new PermissionDeniedError(message, init);
    case 404:
      return new NotFoundError(message, init);
    case 409:
      return new ConflictError(message, init);
    case 422:
      return new ValidationError(message, init);
    case 429:
      return new RateLimitError(message, {
        ...init,
        retryAfter: parseRetryAfter(headers.get('retry-after')),
      });
  }
  if (status >= 500) return new ServerError(message, init);
  return new MeshioError(message, init);
}
