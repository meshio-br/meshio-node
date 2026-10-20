import type { RequestOptions } from '../core.js';
import type { BodyOf, ItemOf, QueryOf, ResponseOf, WithIdempotency } from '../types.js';
import { APIResource, seg } from './base.js';

type O = RequestOptions;

export class Version extends APIResource {
  /** GET /v1/version */
  get(options?: O): Promise<ResponseOf<'version_get'>> {
    return this._call('GET', '/v1/version', { options });
  }
}

export class Businesses extends APIResource {
  /** GET /v1/businesses */
  list(
    query: QueryOf<'businesses_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'businesses_list'>> {
    return this._call('GET', '/v1/businesses', { query, options });
  }
  /** Itera por todos os clientes finais, página a página. */
  listAll(
    query: QueryOf<'businesses_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'businesses_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/businesses/{business_id} */
  get(businessId: string, options?: O): Promise<ResponseOf<'businesses_get'>> {
    return this._call('GET', `/v1/businesses/${seg(businessId)}`, { options });
  }
}

export class SignupSessions extends APIResource {
  /** POST /v1/channels/signup-sessions */
  create(
    body: BodyOf<'signup_sessions_create'>,
    options?: O,
  ): Promise<ResponseOf<'signup_sessions_create'>> {
    return this._call('POST', '/v1/channels/signup-sessions', { body, options });
  }
  /** GET /v1/channels/signup-sessions/{session_id} */
  get(sessionId: string, options?: O): Promise<ResponseOf<'signup_sessions_get'>> {
    return this._call('GET', `/v1/channels/signup-sessions/${seg(sessionId)}`, { options });
  }
  /** POST /v1/channels/signup-sessions/{session_id}/complete */
  complete(
    sessionId: string,
    body: BodyOf<'signup_sessions_complete'>,
    options?: O,
  ): Promise<ResponseOf<'signup_sessions_complete'>> {
    return this._call('POST', `/v1/channels/signup-sessions/${seg(sessionId)}/complete`, {
      body,
      options,
    });
  }
  /** POST /v1/channels/signup-sessions/{session_id}/cancel */
  cancel(
    sessionId: string,
    body: BodyOf<'signup_sessions_cancel'> = {},
    options?: O,
  ): Promise<ResponseOf<'signup_sessions_cancel'>> {
    return this._call('POST', `/v1/channels/signup-sessions/${seg(sessionId)}/cancel`, {
      body,
      options,
    });
  }
}

export class MetaLogs extends APIResource {
  /** GET /v1/channels/{channel_id}/meta-logs */
  list(
    channelId: string,
    query: QueryOf<'meta_logs_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'meta_logs_list'>> {
    return this._call('GET', `/v1/channels/${seg(channelId)}/meta-logs`, { query, options });
  }
  listAll(
    channelId: string,
    query: QueryOf<'meta_logs_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'meta_logs_list'>> {
    return this._all((q) => this.list(channelId, q, options), query);
  }
  /** GET /v1/channels/{channel_id}/meta-logs/{entry_id} */
  get(channelId: string, entryId: string, options?: O): Promise<ResponseOf<'meta_logs_get'>> {
    return this._call('GET', `/v1/channels/${seg(channelId)}/meta-logs/${seg(entryId)}`, {
      options,
    });
  }
}

export class Channels extends APIResource {
  readonly signupSessions = new SignupSessions(this._client);
  readonly metaLogs = new MetaLogs(this._client);

  /** GET /v1/channels */
  list(query: QueryOf<'channels_list'> = {}, options?: O): Promise<ResponseOf<'channels_list'>> {
    return this._call('GET', '/v1/channels', { query, options });
  }
  listAll(
    query: QueryOf<'channels_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'channels_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/channels/{channel_id} */
  get(channelId: string, options?: O): Promise<ResponseOf<'channels_get'>> {
    return this._call('GET', `/v1/channels/${seg(channelId)}`, { options });
  }
  /** GET /v1/channels/{channel_id}/history */
  history(
    channelId: string,
    query: QueryOf<'channels_history'> = {},
    options?: O,
  ): Promise<ResponseOf<'channels_history'>> {
    return this._call('GET', `/v1/channels/${seg(channelId)}/history`, { query, options });
  }
  historyAll(
    channelId: string,
    query: QueryOf<'channels_history'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'channels_history'>> {
    return this._all((q) => this.history(channelId, q, options), query);
  }
  /** POST /v1/channels/{channel_id}/health-check */
  healthCheck(channelId: string, options?: O): Promise<ResponseOf<'channels_health_check'>> {
    return this._call('POST', `/v1/channels/${seg(channelId)}/health-check`, { options });
  }
  /** POST /v1/channels/{channel_id}/disconnect — exige `{ confirm: true }`. */
  disconnect(
    channelId: string,
    body: BodyOf<'channels_disconnect'>,
    options?: O,
  ): Promise<ResponseOf<'channels_disconnect'>> {
    return this._call('POST', `/v1/channels/${seg(channelId)}/disconnect`, { body, options });
  }
}

export class ConnectLinks extends APIResource {
  /** POST /v1/connect-links */
  create(
    body: BodyOf<'connect_links_create'>,
    options?: O,
  ): Promise<ResponseOf<'connect_links_create'>> {
    return this._call('POST', '/v1/connect-links', { body, options });
  }
  /** GET /v1/connect-links */
  list(
    query: QueryOf<'connect_links_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'connect_links_list'>> {
    return this._call('GET', '/v1/connect-links', { query, options });
  }
  listAll(
    query: QueryOf<'connect_links_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'connect_links_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/connect-links/{link_id} */
  get(linkId: string, options?: O): Promise<ResponseOf<'connect_links_get'>> {
    return this._call('GET', `/v1/connect-links/${seg(linkId)}`, { options });
  }
  /** POST /v1/connect-links/{link_id}/revoke */
  revoke(linkId: string, options?: O): Promise<ResponseOf<'connect_links_revoke'>> {
    return this._call('POST', `/v1/connect-links/${seg(linkId)}/revoke`, { options });
  }
}

export class Messages extends APIResource {
  /**
   * POST /v1/messages — envia texto ou template.
   * Sempre envia `Idempotency-Key`: use `options.idempotencyKey` ou o SDK gera um UUID v4,
   * reaproveitado nas novas tentativas automáticas.
   */
  send(
    body: BodyOf<'messages_send'>,
    options?: O,
  ): Promise<WithIdempotency<ResponseOf<'messages_send'>>> {
    return this._idempotent('/v1/messages', body, 'required', options);
  }
  /** GET /v1/messages */
  list(query: QueryOf<'messages_list'> = {}, options?: O): Promise<ResponseOf<'messages_list'>> {
    return this._call('GET', '/v1/messages', { query, options });
  }
  listAll(
    query: QueryOf<'messages_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'messages_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/messages/{message_id} */
  get(messageId: string, options?: O): Promise<ResponseOf<'messages_get'>> {
    return this._call('GET', `/v1/messages/${seg(messageId)}`, { options });
  }
}

export class Conversations extends APIResource {
  /** GET /v1/conversations */
  list(
    query: QueryOf<'conversations_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'conversations_list'>> {
    return this._call('GET', '/v1/conversations', { query, options });
  }
  listAll(
    query: QueryOf<'conversations_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'conversations_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/conversations/{channel_id}/{counterparty} */
  timeline(
    channelId: string,
    counterparty: string,
    query: QueryOf<'conversations_timeline'> = {},
    options?: O,
  ): Promise<ResponseOf<'conversations_timeline'>> {
    return this._call('GET', `/v1/conversations/${seg(channelId)}/${seg(counterparty)}`, {
      query,
      options,
    });
  }
  timelineAll(
    channelId: string,
    counterparty: string,
    query: QueryOf<'conversations_timeline'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'conversations_timeline'>> {
    return this._all((q) => this.timeline(channelId, counterparty, q, options), query);
  }
}

export class Templates extends APIResource {
  /** GET /v1/templates */
  list(query: QueryOf<'templates_list'> = {}, options?: O): Promise<ResponseOf<'templates_list'>> {
    return this._call('GET', '/v1/templates', { query, options });
  }
  listAll(
    query: QueryOf<'templates_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'templates_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** POST /v1/templates */
  create(body: BodyOf<'templates_create'>, options?: O): Promise<ResponseOf<'templates_create'>> {
    return this._call('POST', '/v1/templates', { body, options });
  }
  /** GET /v1/templates/{template_id} */
  get(templateId: string, options?: O): Promise<ResponseOf<'templates_get'>> {
    return this._call('GET', `/v1/templates/${seg(templateId)}`, { options });
  }
  /** DELETE /v1/templates/{template_id} */
  delete(templateId: string, options?: O): Promise<ResponseOf<'templates_delete'>> {
    return this._call('DELETE', `/v1/templates/${seg(templateId)}`, { options });
  }
  /** POST /v1/templates/sync?channel_id=… */
  sync(query: QueryOf<'templates_sync'>, options?: O): Promise<ResponseOf<'templates_sync'>> {
    return this._call('POST', '/v1/templates/sync', { query, options });
  }
  /** POST /v1/templates/{template_id}/submit */
  submit(templateId: string, options?: O): Promise<ResponseOf<'templates_submit'>> {
    return this._call('POST', `/v1/templates/${seg(templateId)}/submit`, { options });
  }
}
