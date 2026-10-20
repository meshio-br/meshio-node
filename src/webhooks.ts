import { createHmac, timingSafeEqual } from 'node:crypto';
import { WebhookVerificationError } from './errors.js';
import type { EventDataMap } from './generated/events.js';

export type { EventDataMap } from './generated/events.js';
export type KnownEventType = keyof EventDataMap;

interface EnvelopeBase {
  event_id: string;
  occurred_at: string;
  business_id: string | null;
  channel_id: string | null;
  [k: string]: unknown;
}

/** Evento de webhook de tipo conhecido, com `data` tipado por `event_type`. */
export type KnownWebhookEvent = {
  [T in KnownEventType]: EnvelopeBase & { event_type: T; data: EventDataMap[T] };
}[KnownEventType];

/** Evento de tipo ainda não conhecido por esta versão do SDK (não quebra a verificação). */
export type UnknownWebhookEvent = EnvelopeBase & {
  event_type: string & {};
  data: Record<string, unknown>;
};

export type WebhookEvent = KnownWebhookEvent | UnknownWebhookEvent;

export type HeadersLike =
  | Headers
  | Record<string, string | string[] | undefined>
  | Iterable<[string, string]>;

export interface VerifyOptions {
  /** Tolerância em segundos entre o relógio local e `Meshio-Timestamp` (padrão 300). */
  tolerance?: number;
  /** Relógio a usar, em segundos Unix (útil em testes). */
  now?: number;
}

export const DEFAULT_TOLERANCE_SECONDS = 300;

function getHeader(headers: HeadersLike, name: string): string | undefined {
  const lower = name.toLowerCase();
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? undefined;
  }
  const entries: Iterable<[string, unknown]> =
    Symbol.iterator in (headers as object)
      ? (headers as Iterable<[string, string]>)
      : Object.entries(headers as Record<string, unknown>);
  for (const [k, v] of entries) {
    if (k.toLowerCase() === lower) {
      if (Array.isArray(v)) return v.join(',');
      return v === undefined || v === null ? undefined : String(v);
    }
  }
  return undefined;
}

function toBuffer(body: string | Uint8Array): Buffer {
  return typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);
}

/** Calcula `v1=<hex>` para um corpo e timestamp (útil em testes). */
export function computeSignature(
  rawBody: string | Uint8Array,
  timestamp: number | string,
  secret: string,
): string {
  const mac = createHmac('sha256', Buffer.from(secret, 'utf8'));
  mac.update(`${timestamp}.`, 'utf8');
  mac.update(toBuffer(rawBody));
  return `v1=${mac.digest('hex')}`;
}

/**
 * Verifica a assinatura de um webhook e devolve o evento.
 * Use o corpo **bruto** exatamente como recebido (string ou bytes), nunca um JSON re-serializado.
 * Lança `WebhookVerificationError` se a assinatura for inválida ou o timestamp sair da tolerância.
 */
export function verify(
  rawBody: string | Uint8Array,
  headers: HeadersLike,
  secret: string,
  toleranceOrOptions: number | VerifyOptions = DEFAULT_TOLERANCE_SECONDS,
): WebhookEvent {
  const opts =
    typeof toleranceOrOptions === 'number' ? { tolerance: toleranceOrOptions } : toleranceOrOptions;
  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
  if (!secret) throw new WebhookVerificationError('Segredo do webhook não informado.');

  const tsHeader = getHeader(headers, 'Meshio-Timestamp');
  const sigHeader = getHeader(headers, 'Meshio-Signature');
  if (!tsHeader) throw new WebhookVerificationError('Cabeçalho Meshio-Timestamp ausente.');
  if (!sigHeader) throw new WebhookVerificationError('Cabeçalho Meshio-Signature ausente.');
  if (!/^\d+$/.test(tsHeader.trim())) {
    throw new WebhookVerificationError('Cabeçalho Meshio-Timestamp inválido.');
  }
  const timestamp = Number(tsHeader.trim());
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    throw new WebhookVerificationError('Timestamp do webhook fora da tolerância.');
  }

  const expected = Buffer.from(computeSignature(rawBody, timestamp, secret).slice(3), 'hex');
  const candidates = sigHeader
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('v1='))
    .map((s) => s.slice(3));
  const matched = candidates.some((hex) => {
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== expected.length * 2) return false;
    return timingSafeEqual(Buffer.from(hex, 'hex'), expected);
  });
  if (!matched) throw new WebhookVerificationError('Assinatura do webhook inválida.');

  const text = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
  let event: unknown;
  try {
    event = JSON.parse(text);
  } catch (cause) {
    throw new WebhookVerificationError('Corpo do webhook não é JSON válido.', { cause });
  }
  if (
    !event ||
    typeof event !== 'object' ||
    typeof (event as WebhookEvent).event_type !== 'string'
  ) {
    throw new WebhookVerificationError('Corpo do webhook não é um evento Meshio.');
  }
  return event as WebhookEvent;
}

/** Sinônimo de `verify`. */
export const constructEvent = verify;

/** Restringe o tipo de um evento por `event_type`. */
export function isEventType<T extends KnownEventType>(
  event: WebhookEvent,
  type: T,
): event is Extract<KnownWebhookEvent, { event_type: T }> {
  return event.event_type === type;
}

export const webhooks = { verify, constructEvent, computeSignature, isEventType };
export type Webhooks = typeof webhooks;
