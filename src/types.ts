import type { components, operations } from './generated/openapi.js';

/** Todos os modelos do contrato OpenAPI (ex.: `Schemas['SendMessageIn']`). */
export type Schemas = components['schemas'];
export type OperationId = keyof operations;

type Op<K extends OperationId> = operations[K];

/** Parâmetros de query de uma operação. */
export type QueryOf<K extends OperationId> = Op<K>['parameters'] extends { query?: infer Q }
  ? Exclude<Q, undefined>
  : never;

/** Corpo JSON de uma operação. */
export type BodyOf<K extends OperationId> = Op<K> extends {
  requestBody?: { content: { 'application/json': infer B } };
}
  ? B
  : never;

type JsonOf<R> = R extends { content: { 'application/json': infer T } } ? T : never;

/** Resposta de sucesso (200, 201 ou 202) de uma operação. */
export type ResponseOf<K extends OperationId> = Op<K>['responses'] extends infer R
  ? R extends { 200: infer A }
    ? JsonOf<A>
    : R extends { 201: infer B }
      ? JsonOf<B>
      : R extends { 202: infer C }
        ? JsonOf<C>
        : undefined
  : never;

/** Página de uma listagem: `{ data, next_cursor }`. */
export interface Page<T> {
  data: T[];
  next_cursor?: string | null;
}

/** Item de uma listagem paginada. */
export type ItemOf<K extends OperationId> = ResponseOf<K> extends { data: Array<infer I> }
  ? I
  : never;

/** Resposta acrescida do indicador de repetição idempotente. */
export type WithIdempotency<T> = T & { idempotent_replay?: boolean };
