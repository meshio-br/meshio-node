import type { RequestOptions } from '../core.js';
import type { BodyOf, ItemOf, QueryOf, ResponseOf, WithIdempotency } from '../types.js';
import { APIResource, seg } from './base.js';

type O = RequestOptions;

export class Usage extends APIResource {
  /** GET /v1/usage */
  get(query: QueryOf<'usage_get'> = {}, options?: O): Promise<ResponseOf<'usage_get'>> {
    return this._call('GET', '/v1/usage', { query, options });
  }
  /** GET /v1/usage/export.csv — devolve o CSV como texto. */
  exportCsv(query: QueryOf<'usage_export_csv'> = {}, options?: O): Promise<string> {
    return this._call('GET', '/v1/usage/export.csv', { query, options, responseType: 'text' });
  }
  /** GET /v1/overview */
  overview(query: QueryOf<'overview_get'> = {}, options?: O): Promise<ResponseOf<'overview_get'>> {
    return this._call('GET', '/v1/overview', { query, options });
  }
  /** GET /v1/status/integration */
  integrationStatus(options?: O): Promise<ResponseOf<'status_integration'>> {
    return this._call('GET', '/v1/status/integration', { options });
  }
}

export class Compliance extends APIResource {
  /** GET /v1/compliance/status */
  status(options?: O): Promise<ResponseOf<'compliance_status'>> {
    return this._call('GET', '/v1/compliance/status', { options });
  }
}

export class Consents extends APIResource {
  /** GET /v1/consents */
  list(query: QueryOf<'consents_list'> = {}, options?: O): Promise<ResponseOf<'consents_list'>> {
    return this._call('GET', '/v1/consents', { query, options });
  }
  listAll(
    query: QueryOf<'consents_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'consents_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** POST /v1/consents */
  create(body: BodyOf<'consents_create'>, options?: O): Promise<ResponseOf<'consents_create'>> {
    return this._call('POST', '/v1/consents', { body, options });
  }
  /** DELETE /v1/consents/{consent_id} */
  delete(consentId: string, options?: O): Promise<ResponseOf<'consents_delete'>> {
    return this._call('DELETE', `/v1/consents/${seg(consentId)}`, { options });
  }
}

export class OptOuts extends APIResource {
  /** GET /v1/opt-outs */
  list(query: QueryOf<'opt_outs_list'> = {}, options?: O): Promise<ResponseOf<'opt_outs_list'>> {
    return this._call('GET', '/v1/opt-outs', { query, options });
  }
  listAll(
    query: QueryOf<'opt_outs_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'opt_outs_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** POST /v1/opt-outs */
  create(body: BodyOf<'opt_outs_create'>, options?: O): Promise<ResponseOf<'opt_outs_create'>> {
    return this._call('POST', '/v1/opt-outs', { body, options });
  }
  /** DELETE /v1/opt-outs?business_id=…&phone=… */
  delete(query: QueryOf<'opt_outs_delete'>, options?: O): Promise<void> {
    return this._call('DELETE', '/v1/opt-outs', { query, options });
  }
}

export class BillingEntries extends APIResource {
  /** GET /v1/billing/entries */
  list(
    query: QueryOf<'billing_entries_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'billing_entries_list'>> {
    return this._call('GET', '/v1/billing/entries', { query, options });
  }
  listAll(
    query: QueryOf<'billing_entries_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'billing_entries_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/billing/entries/export.csv — devolve o CSV como texto. */
  exportCsv(query: QueryOf<'billing_entries_export_csv'> = {}, options?: O): Promise<string> {
    return this._call('GET', '/v1/billing/entries/export.csv', {
      query,
      options,
      responseType: 'text',
    });
  }
}

export class NumberFees extends APIResource {
  /** GET /v1/billing/number-fees */
  list(
    query: QueryOf<'billing_number_fees_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'billing_number_fees_list'>> {
    return this._call('GET', '/v1/billing/number-fees', { query, options });
  }
  listAll(
    query: QueryOf<'billing_number_fees_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'billing_number_fees_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/billing/number-fees/summary */
  summary(options?: O): Promise<ResponseOf<'billing_number_fees_summary'>> {
    return this._call('GET', '/v1/billing/number-fees/summary', { options });
  }
}

export class BillingSettings extends APIResource {
  /** GET /v1/billing/settings/public */
  get(options?: O): Promise<ResponseOf<'billing_settings_get'>> {
    return this._call('GET', '/v1/billing/settings/public', { options });
  }
  /** PATCH /v1/billing/settings */
  update(
    body: BodyOf<'billing_settings_update'>,
    options?: O,
  ): Promise<ResponseOf<'billing_settings_update'>> {
    return this._call('PATCH', '/v1/billing/settings', { body, options });
  }
}

export class Topups extends APIResource {
  /** GET /v1/billing/topups */
  list(query: QueryOf<'topups_list'> = {}, options?: O): Promise<ResponseOf<'topups_list'>> {
    return this._call('GET', '/v1/billing/topups', { query, options });
  }
  listAll(query: QueryOf<'topups_list'> = {}, options?: O): AsyncGenerator<ItemOf<'topups_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /**
   * POST /v1/billing/topups — `Idempotency-Key` opcional (via `options.idempotencyKey`).
   * Sem chave, a requisição não é repetida automaticamente em falhas.
   */
  create(
    body: BodyOf<'topups_create'>,
    options?: O,
  ): Promise<WithIdempotency<ResponseOf<'topups_create'>>> {
    return this._idempotent('/v1/billing/topups', body, 'optional', options);
  }
  /** GET /v1/billing/topups/{topup_id} */
  get(topupId: string, options?: O): Promise<ResponseOf<'topups_get'>> {
    return this._call('GET', `/v1/billing/topups/${seg(topupId)}`, { options });
  }
  /** POST /v1/billing/topups/{topup_id}/refund-request */
  requestRefund(
    topupId: string,
    body: BodyOf<'topups_request_refund'>,
    options?: O,
  ): Promise<ResponseOf<'topups_request_refund'>> {
    return this._call('POST', `/v1/billing/topups/${seg(topupId)}/refund-request`, {
      body,
      options,
    });
  }
}

export class Billing extends APIResource {
  readonly entries = new BillingEntries(this._client);
  readonly numberFees = new NumberFees(this._client);
  readonly settings = new BillingSettings(this._client);
  readonly topups = new Topups(this._client);

  /** GET /v1/billing/wallet */
  wallet(options?: O): Promise<ResponseOf<'billing_wallet'>> {
    return this._call('GET', '/v1/billing/wallet', { options });
  }
  /** GET /v1/billing/pricing */
  pricing(options?: O): Promise<ResponseOf<'billing_pricing'>> {
    return this._call('GET', '/v1/billing/pricing', { options });
  }
  /** GET /v1/billing/consumption */
  consumption(
    query: QueryOf<'billing_consumption'> = {},
    options?: O,
  ): Promise<ResponseOf<'billing_consumption'>> {
    return this._call('GET', '/v1/billing/consumption', { query, options });
  }
  /** GET /v1/billing/trial */
  trial(options?: O): Promise<ResponseOf<'billing_trial'>> {
    return this._call('GET', '/v1/billing/trial', { options });
  }
  /** GET /v1/billing/bonus-offers */
  bonusOffers(options?: O): Promise<ResponseOf<'billing_bonus_offers'>> {
    return this._call('GET', '/v1/billing/bonus-offers', { options });
  }
}
