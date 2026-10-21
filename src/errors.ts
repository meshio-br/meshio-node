/**
 * Erros do SDK. `message` vem do servidor e é informativa (pode estar em inglês); a explicação
 * em pt-BR vem em `details.message_pt` (exposta em `messagePt`) e, em validação, em `details.fields`.
 */

/**
 * Códigos de erro da cobrança por assinatura. Todos trazem `details.message_pt` e, quando há
 * motivo, `details.reason` (exposto em `reason`).
 *
 * - 402 `SUBSCRIPTION_REQUIRED` (`trial_ended`, `no_plan`, `subscription_canceled`,
 *   `subscription_incomplete`), `SUBSCRIPTION_PAST_DUE`, `ALLOWANCE_EXHAUSTED`
 *   (`allowance_exhausted`, `trial_allowance_exhausted`, `overage_unavailable`,
 *   `overage_not_authorized`, `overage_limit_reached`);
 * - 409 `NUMBER_LIMIT_REACHED` (`trial`, `seats`, `no_active_plan`), `OVERAGE_UNAVAILABLE`
 *   (`price_undefined`, `trial`, `feature_disabled`);
 * - 422 `PAYMENT_METHOD_UNAVAILABLE`;
 * - 503 `BILLING_NOT_CONFIGURED` (nenhuma tabela de preços publicada);
 * - 410 `DISCONTINUED` (rota do modelo antigo; `details.replacement` indica a substituta).
 */
export type BillingErrorCode =
  | 'SUBSCRIPTION_REQUIRED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'ALLOWANCE_EXHAUSTED'
  | 'NUMBER_LIMIT_REACHED'
  | 'OVERAGE_UNAVAILABLE'
  | 'PAYMENT_METHOD_UNAVAILABLE'
  | 'BILLING_NOT_CONFIGURED'
  | 'DISCONTINUED';

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
  /** Explicação em pt-BR enviada pela API em `details.message_pt`, quando houver. */
  readonly messagePt: string | undefined;
  /** Motivo detalhado em `details.reason`, quando houver (ex.: `trial_ended`, `seats`). */
  readonly reason: string | undefined;

  constructor(message: string, init: MeshioErrorInit = {}) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = new.target.name;
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? {};
    this.requestId = init.requestId;
    this.headers = init.headers;
    const pt = this.details.message_pt;
    this.messagePt = typeof pt === 'string' && pt ? pt : undefined;
    const reason = this.details.reason;
    this.reason = typeof reason === 'string' && reason ? reason : undefined;
  }
}

export class BadRequestError extends MeshioError {}
export class AuthenticationError extends MeshioError {}
/**
 * 402: envio bloqueado pela cobrança (`SUBSCRIPTION_REQUIRED`, `SUBSCRIPTION_PAST_DUE`,
 * `ALLOWANCE_EXHAUSTED`). Veja `reason` e `messagePt`.
 */
export class PaymentRequiredError extends MeshioError {}
export class PermissionDeniedError extends MeshioError {}
export class NotFoundError extends MeshioError {}
/** 410 `DISCONTINUED`: rota do modelo antigo. `replacement` indica a rota que a substitui. */
export class GoneError extends MeshioError {
  readonly replacement: string | undefined;
  constructor(message: string, init: MeshioErrorInit = {}) {
    super(message, init);
    const r = this.details.replacement;
    this.replacement = typeof r === 'string' && r ? r : undefined;
  }
}
/** 409, inclusive `IDEMPOTENCY_CONFLICT`, `NUMBER_LIMIT_REACHED` e `OVERAGE_UNAVAILABLE`. */
export class ConflictError extends MeshioError {}

/** 422 (inclusive `PAYMENT_METHOD_UNAVAILABLE`). `fields` traz o mapa campo → mensagem de `details.fields`. */
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

/** 5xx, inclusive 503 `BILLING_NOT_CONFIGURED`. */
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
    case 402:
      return new PaymentRequiredError(message, init);
    case 403:
      return new PermissionDeniedError(message, init);
    case 404:
      return new NotFoundError(message, init);
    case 409:
      return new ConflictError(message, init);
    case 410:
      return new GoneError(message, init);
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
