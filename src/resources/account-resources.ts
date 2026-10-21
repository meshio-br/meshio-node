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

export class SubscriptionSeats extends APIResource {
  /** POST /v1/billing/subscription/seats/preview — impacto de `{add}` ou `{target}`, sem alterar nada. */
  preview(
    body: BodyOf<'billing_subscription_seats_preview'>,
    options?: O,
  ): Promise<ResponseOf<'billing_subscription_seats_preview'>> {
    return this._call('POST', '/v1/billing/subscription/seats/preview', { body, options });
  }
  /**
   * POST /v1/billing/subscription/seats — `{add}` (imediato, fatura proporcional), `{target}`
   * (redução na renovação) ou `{cancel_scheduled_reduction: true}`.
   * Leva `Idempotency-Key`: se não informada, o SDK gera um UUID v4 e o reaproveita nas novas
   * tentativas; com `{add}`, a mesma chave devolve a mesma fatura proporcional.
   */
  change(
    body: BodyOf<'billing_subscription_seats_change'>,
    options?: O,
  ): Promise<WithIdempotency<ResponseOf<'billing_subscription_seats_change'>>> {
    return this._idempotent('/v1/billing/subscription/seats', body, 'required', options);
  }
}

export class Subscription extends APIResource {
  readonly seats = new SubscriptionSeats(this._client);

  /** GET /v1/billing/subscription — situação: status, vagas, ciclo, renovação, excedente, atraso. */
  get(options?: O): Promise<ResponseOf<'billing_subscription_get'>> {
    return this._call('GET', '/v1/billing/subscription', { options });
  }
  /** POST /v1/billing/subscription/preview — `{seats}` → faixa, preço unitário, total e franquia. */
  preview(
    body: BodyOf<'billing_subscription_preview'>,
    options?: O,
  ): Promise<ResponseOf<'billing_subscription_preview'>> {
    return this._call('POST', '/v1/billing/subscription/preview', { body, options });
  }
  /**
   * POST /v1/billing/subscription — contrata `{seats, payment_method}` e devolve a assinatura com
   * a primeira fatura. Leva `Idempotency-Key`: se não informada, o SDK gera um UUID v4 e o
   * reaproveita nas novas tentativas (sem cobrar de novo).
   */
  create(
    body: BodyOf<'billing_subscription_create'>,
    options?: O,
  ): Promise<WithIdempotency<ResponseOf<'billing_subscription_create'>>> {
    return this._idempotent('/v1/billing/subscription', body, 'required', options);
  }
  /** POST /v1/billing/subscription/cancel — cancela no fim do ciclo. */
  cancel(options?: O): Promise<ResponseOf<'billing_subscription_cancel'>> {
    return this._call('POST', '/v1/billing/subscription/cancel', { options });
  }
  /** POST /v1/billing/subscription/resume — desfaz o cancelamento antes do fim do ciclo. */
  resume(options?: O): Promise<ResponseOf<'billing_subscription_resume'>> {
    return this._call('POST', '/v1/billing/subscription/resume', { options });
  }
  /** PATCH /v1/billing/subscription/overage — `{enabled, limit_micros}`. */
  updateOverage(
    body: BodyOf<'billing_subscription_overage_update'>,
    options?: O,
  ): Promise<ResponseOf<'billing_subscription_overage_update'>> {
    return this._call('PATCH', '/v1/billing/subscription/overage', { body, options });
  }
  /** PATCH /v1/billing/subscription/payment-method — `{payment_method, accept_wallet_terms?}`. */
  updatePaymentMethod(
    body: BodyOf<'billing_subscription_payment_method_update'>,
    options?: O,
  ): Promise<ResponseOf<'billing_subscription_payment_method_update'>> {
    return this._call('PATCH', '/v1/billing/subscription/payment-method', { body, options });
  }
}

export class AllowanceConsumptions extends APIResource {
  /** GET /v1/billing/allowance/consumptions — evidências do que contou na franquia. */
  list(
    query: QueryOf<'billing_allowance_consumptions_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'billing_allowance_consumptions_list'>> {
    return this._call('GET', '/v1/billing/allowance/consumptions', { query, options });
  }
  listAll(
    query: QueryOf<'billing_allowance_consumptions_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'billing_allowance_consumptions_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
}

export class Allowance extends APIResource {
  readonly consumptions = new AllowanceConsumptions(this._client);

  /** GET /v1/billing/allowance — franquia do ciclo atual (incluídas, usadas, restantes, %). */
  get(options?: O): Promise<ResponseOf<'billing_allowance_get'>> {
    return this._call('GET', '/v1/billing/allowance', { options });
  }
}

export class Cycles extends APIResource {
  /** GET /v1/billing/cycles */
  list(
    query: QueryOf<'billing_cycles_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'billing_cycles_list'>> {
    return this._call('GET', '/v1/billing/cycles', { query, options });
  }
  listAll(
    query: QueryOf<'billing_cycles_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'billing_cycles_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
}

export class Invoices extends APIResource {
  /** GET /v1/billing/invoices */
  list(
    query: QueryOf<'billing_invoices_list'> = {},
    options?: O,
  ): Promise<ResponseOf<'billing_invoices_list'>> {
    return this._call('GET', '/v1/billing/invoices', { query, options });
  }
  listAll(
    query: QueryOf<'billing_invoices_list'> = {},
    options?: O,
  ): AsyncGenerator<ItemOf<'billing_invoices_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/billing/invoices/{invoice_id} */
  get(invoiceId: string, options?: O): Promise<ResponseOf<'billing_invoices_get'>> {
    return this._call('GET', `/v1/billing/invoices/${seg(invoiceId)}`, { options });
  }
  /**
   * POST /v1/billing/invoices/{invoice_id}/pay — `{method: "link"}` (novo link de pagamento) ou
   * `{method: "wallet"}` (saldo anterior). Leva `Idempotency-Key`: se não informada, o SDK gera um
   * UUID v4 e o reaproveita nas novas tentativas.
   */
  pay(
    invoiceId: string,
    body: BodyOf<'billing_invoices_pay'> = {},
    options?: O,
  ): Promise<WithIdempotency<ResponseOf<'billing_invoices_pay'>>> {
    return this._idempotent(
      `/v1/billing/invoices/${seg(invoiceId)}/pay`,
      body,
      'required',
      options,
    );
  }
}

/** Recargas do modelo antigo: só histórico (não há novas recargas). */
export class Topups extends APIResource {
  /** GET /v1/billing/topups */
  list(query: QueryOf<'topups_list'> = {}, options?: O): Promise<ResponseOf<'topups_list'>> {
    return this._call('GET', '/v1/billing/topups', { query, options });
  }
  listAll(query: QueryOf<'topups_list'> = {}, options?: O): AsyncGenerator<ItemOf<'topups_list'>> {
    return this._all((q) => this.list(q, options), query);
  }
  /** GET /v1/billing/topups/{topup_id} */
  get(topupId: string, options?: O): Promise<ResponseOf<'topups_get'>> {
    return this._call('GET', `/v1/billing/topups/${seg(topupId)}`, { options });
  }
}

/** Cobrança por assinatura de números: assinatura, franquia, ciclos, faturas e histórico. */
export class Billing extends APIResource {
  readonly subscription = new Subscription(this._client);
  readonly allowance = new Allowance(this._client);
  readonly cycles = new Cycles(this._client);
  readonly invoices = new Invoices(this._client);
  readonly entries = new BillingEntries(this._client);
  readonly topups = new Topups(this._client);

  /** GET /v1/billing/pricing — condições vigentes para você. */
  pricing(options?: O): Promise<ResponseOf<'billing_pricing'>> {
    return this._call('GET', '/v1/billing/pricing', { options });
  }
  /** GET /v1/billing/wallet — saldo anterior preservado e consentimento de pagamento com saldo. */
  wallet(options?: O): Promise<ResponseOf<'billing_wallet'>> {
    return this._call('GET', '/v1/billing/wallet', { options });
  }
}
