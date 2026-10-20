import { Meshio } from './client.js';

export { Meshio };
export default Meshio;

export {
  type ApiResponse,
  type ClientOptions,
  type FetchLike,
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  HttpClient,
  type RequestOptions,
} from './core.js';
export {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  ConnectionError,
  MeshioError,
  NotFoundError,
  PermissionDeniedError,
  PolicyBlockedError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
  WebhookVerificationError,
} from './errors.js';
export { microsToReais, reaisToMicros } from './money.js';
export { paginate } from './pagination.js';
export type {
  BodyOf,
  ItemOf,
  OperationId,
  Page,
  QueryOf,
  ResponseOf,
  Schemas,
  WithIdempotency,
} from './types.js';
export {
  computeSignature,
  constructEvent,
  type EventDataMap,
  type HeadersLike,
  isEventType,
  type KnownEventType,
  type KnownWebhookEvent,
  type UnknownWebhookEvent,
  type VerifyOptions,
  verify,
  type WebhookEvent,
  webhooks,
} from './webhooks.js';
export type * as EventTypes from './generated/events.js';
export type { components, operations, paths } from './generated/openapi.js';
export { VERSION } from './version.js';
