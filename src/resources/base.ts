import type { HttpClient, RequestOptions, RequestSpec } from '../core.js';
import { paginate } from '../pagination.js';
import type { Page, WithIdempotency } from '../types.js';

/** Codifica um segmento de caminho. */
export const seg = (value: string): string => encodeURIComponent(value);

export abstract class APIResource {
  constructor(protected readonly _client: HttpClient) {}

  protected async _call<T>(
    method: RequestSpec['method'],
    path: string,
    extra: Omit<RequestSpec, 'method' | 'path'> = {},
  ): Promise<T> {
    const res = await this._client.request<T>({ method, path, ...extra });
    return res.data;
  }

  /** Requisição com `Idempotency-Key`; expõe `idempotent_replay` na resposta. */
  protected async _idempotent<T>(
    path: string,
    body: unknown,
    mode: 'required' | 'optional',
    options?: RequestOptions,
  ): Promise<WithIdempotency<T>> {
    const res = await this._client.request<T>({
      method: 'POST',
      path,
      body,
      idempotency: mode,
      options,
    });
    const data = res.data as WithIdempotency<T>;
    if (
      data &&
      typeof data === 'object' &&
      (data as { idempotent_replay?: unknown }).idempotent_replay === undefined
    ) {
      (data as { idempotent_replay?: boolean }).idempotent_replay = res.idempotentReplay;
    }
    return data;
  }

  protected _all<T, Q extends { cursor?: string | null }>(
    fetchPage: (q: Q) => Promise<Page<T>>,
    query: Q,
  ): AsyncGenerator<T, void, undefined> {
    return paginate<T>(
      (cursor) => fetchPage({ ...query, cursor: cursor ?? query.cursor ?? undefined }),
      undefined,
    );
  }
}
