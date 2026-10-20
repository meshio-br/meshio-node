import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Meshio } from '../../src/index.js';
import { client, json, mockFetch } from '../helpers.js';

// Cada operationId do contrato → chamada correspondente no SDK.
// IDs de caminho usam o próprio nome do parâmetro para conferir o template.
const calls: Record<string, (m: Meshio) => Promise<unknown>> = {
  version_get: (m) => m.version.get(),
  businesses_list: (m) => m.businesses.list(),
  businesses_get: (m) => m.businesses.get('business_id'),
  channels_list: (m) => m.channels.list(),
  channels_get: (m) => m.channels.get('channel_id'),
  channels_history: (m) => m.channels.history('channel_id'),
  channels_health_check: (m) => m.channels.healthCheck('channel_id'),
  channels_disconnect: (m) => m.channels.disconnect('channel_id', { confirm: true }),
  signup_sessions_create: (m) => m.channels.signupSessions.create({} as never),
  signup_sessions_get: (m) => m.channels.signupSessions.get('session_id'),
  signup_sessions_complete: (m) => m.channels.signupSessions.complete('session_id', {} as never),
  signup_sessions_cancel: (m) => m.channels.signupSessions.cancel('session_id'),
  meta_logs_list: (m) => m.channels.metaLogs.list('channel_id'),
  meta_logs_get: (m) => m.channels.metaLogs.get('channel_id', 'entry_id'),
  connect_links_create: (m) => m.connectLinks.create({} as never),
  connect_links_list: (m) => m.connectLinks.list(),
  connect_links_get: (m) => m.connectLinks.get('link_id'),
  connect_links_revoke: (m) => m.connectLinks.revoke('link_id'),
  messages_send: (m) => m.messages.send({} as never),
  messages_list: (m) => m.messages.list(),
  messages_get: (m) => m.messages.get('message_id'),
  conversations_list: (m) => m.conversations.list(),
  conversations_timeline: (m) => m.conversations.timeline('channel_id', 'counterparty'),
  templates_list: (m) => m.templates.list(),
  templates_create: (m) => m.templates.create({} as never),
  templates_get: (m) => m.templates.get('template_id'),
  templates_delete: (m) => m.templates.delete('template_id'),
  templates_sync: (m) => m.templates.sync({ channel_id: 'c' }),
  templates_submit: (m) => m.templates.submit('template_id'),
  webhook_endpoints_list: (m) => m.webhookEndpoints.list(),
  webhook_endpoints_create: (m) => m.webhookEndpoints.create({} as never),
  webhook_endpoints_get: (m) => m.webhookEndpoints.get('endpoint_id'),
  webhook_endpoints_update: (m) => m.webhookEndpoints.update('endpoint_id', {}),
  webhook_endpoints_delete: (m) => m.webhookEndpoints.delete('endpoint_id'),
  webhook_endpoints_rotate_secret: (m) => m.webhookEndpoints.rotateSecret('endpoint_id'),
  webhook_endpoints_test: (m) => m.webhookEndpoints.test('endpoint_id'),
  webhook_deliveries_list: (m) => m.webhookDeliveries.list(),
  webhook_deliveries_get: (m) => m.webhookDeliveries.get('delivery_id'),
  webhook_deliveries_replay: (m) => m.webhookDeliveries.replay('delivery_id'),
  events_list: (m) => m.events.list(),
  events_get: (m) => m.events.get('event_id'),
  usage_get: (m) => m.usage.get(),
  usage_export_csv: (m) => m.usage.exportCsv(),
  overview_get: (m) => m.usage.overview(),
  status_integration: (m) => m.usage.integrationStatus(),
  compliance_status: (m) => m.compliance.status(),
  consents_list: (m) => m.consents.list(),
  consents_create: (m) => m.consents.create({} as never),
  consents_delete: (m) => m.consents.delete('consent_id'),
  opt_outs_list: (m) => m.optOuts.list(),
  opt_outs_create: (m) => m.optOuts.create({} as never),
  opt_outs_delete: (m) => m.optOuts.delete({ business_id: 'b', phone: 'p' }),
  billing_wallet: (m) => m.billing.wallet(),
  billing_pricing: (m) => m.billing.pricing(),
  billing_entries_list: (m) => m.billing.entries.list(),
  billing_entries_export_csv: (m) => m.billing.entries.exportCsv(),
  billing_consumption: (m) => m.billing.consumption(),
  billing_number_fees_list: (m) => m.billing.numberFees.list(),
  billing_number_fees_summary: (m) => m.billing.numberFees.summary(),
  billing_trial: (m) => m.billing.trial(),
  billing_settings_get: (m) => m.billing.settings.get(),
  billing_settings_update: (m) => m.billing.settings.update({ low_balance_threshold_micros: '0' }),
  billing_bonus_offers: (m) => m.billing.bonusOffers(),
  topups_list: (m) => m.billing.topups.list(),
  topups_create: (m) => m.billing.topups.create({} as never),
  topups_get: (m) => m.billing.topups.get('topup_id'),
  topups_request_refund: (m) => m.billing.topups.requestRefund('topup_id', { reason: 'x' }),
};

const spec = JSON.parse(
  readFileSync(new URL('../../openapi/openapi.json', import.meta.url), 'utf8'),
) as {
  paths: Record<string, Record<string, { operationId: string }>>;
};
const ops: Array<{ id: string; method: string; path: string }> = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (['get', 'post', 'patch', 'put', 'delete'].includes(method)) {
      ops.push({
        id: op.operationId,
        method: method.toUpperCase(),
        path: path.replace(/[{}]/g, ''),
      });
    }
  }
}

describe('cobertura do contrato', () => {
  it('contrato tem 67 operações e todas estão mapeadas', () => {
    expect(ops).toHaveLength(67);
    expect(Object.keys(calls).sort()).toEqual(ops.map((o) => o.id).sort());
  });

  for (const op of ops) {
    it(`${op.id}: ${op.method} ${op.path}`, async () => {
      const f = mockFetch(json(200, { data: [], next_cursor: null }));
      await calls[op.id]!(client(f.fn));
      expect(f.calls).toHaveLength(1);
      expect(f.calls[0]!.method).toBe(op.method);
      expect(f.calls[0]!.url.pathname).toBe(op.path);
    });
  }
});
