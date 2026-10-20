import type { RequestOptions } from '../core.js';
import type { BodyOf, ItemOf, QueryOf, ResponseOf } from '../types.js';
import { APIResource, seg } from './base.js';

type O = RequestOptions;

export class WebhookEndpoints extends APIResource {
  /** GET /v1/webhook-endpoints */
  list(
    query: QueryOf<'webhook_endpoints_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'webhook_endpoints_list'>> {
    return this._call('GET', '/v1/webhook-endpoints', { query, options });
  }
  listAll(
    query: QueryOf<'webhook_endpoints_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'webhook_endpoints_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** POST /v1/webhook-endpoints — a resposta traz o segredo (`whsec_…`) uma única vez. */
  create(
    body: BodyOf<'webhook_endpoints_create'>,
    options?: O,
  ): Promise<ResponseOf<'webhook_endpoints_create'>> {
    return this._call('POST', '/v1/webhook-endpoints', { body, options });
  }
  /** GET /v1/webhook-endpoints/{endpoint_id} */
  get(endpointId: string, options?: O): Promise<ResponseOf<'webhook_endpoints_get'>> {
    return this._call('GET', `/v1/webhook-endpoints/${seg(endpointId)}`, { options });
  }
  /** PATCH /v1/webhook-endpoints/{endpoint_id} */
  update(
    endpointId: string,
    body: BodyOf<'webhook_endpoints_update'>,
    options?: O,
  ): Promise<ResponseOf<'webhook_endpoints_update'>> {
    return this._call('PATCH', `/v1/webhook-endpoints/${seg(endpointId)}`, { body, options });
  }
  /** DELETE /v1/webhook-endpoints/{endpoint_id} */
  delete(endpointId: string, options?: O): Promise<void> {
    return this._call('DELETE', `/v1/webhook-endpoints/${seg(endpointId)}`, { options });
  }
  /** POST /v1/webhook-endpoints/{endpoint_id}/rotate-secret */
  rotateSecret(
    endpointId: string,
    options?: O,
  ): Promise<ResponseOf<'webhook_endpoints_rotate_secret'>> {
    return this._call('POST', `/v1/webhook-endpoints/${seg(endpointId)}/rotate-secret`, {
      options,
    });
  }
  /** POST /v1/webhook-endpoints/{endpoint_id}/test — dispara um evento `webhook.test`. */
  test(endpointId: string, options?: O): Promise<ResponseOf<'webhook_endpoints_test'>> {
    return this._call('POST', `/v1/webhook-endpoints/${seg(endpointId)}/test`, { options });
  }
}

export class WebhookDeliveries extends APIResource {
  /** GET /v1/webhook-deliveries */
  list(
    query: QueryOf<'webhook_deliveries_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'webhook_deliveries_list'>> {
    return this._call('GET', '/v1/webhook-deliveries', { query, options });
  }
  listAll(
    query: QueryOf<'webhook_deliveries_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'webhook_deliveries_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/webhook-deliveries/{delivery_id} */
  get(deliveryId: string, options?: O): Promise<ResponseOf<'webhook_deliveries_get'>> {
    return this._call('GET', `/v1/webhook-deliveries/${seg(deliveryId)}`, { options });
  }
  /** POST /v1/webhook-deliveries/{delivery_id}/replay */
  replay(deliveryId: string, options?: O): Promise<ResponseOf<'webhook_deliveries_replay'>> {
    return this._call('POST', `/v1/webhook-deliveries/${seg(deliveryId)}/replay`, { options });
  }
}

export class Events extends APIResource {
  /** GET /v1/events */
  list(query: QueryOf<'events_list'> = {}, options?: O): Promise<ResponseOf<'events_list'>> {
    return this._call('GET', '/v1/events', { query, options });
  }
  listAll(query: QueryOf<'events_list'> = {}, options?: O): AsyncGenerator<ItemOf<'events_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/events/{event_id} */
  get(eventId: string, options?: O): Promise<ResponseOf<'events_get'>> {
    return this._call('GET', `/v1/events/${seg(eventId)}`, { options });
  }
}
