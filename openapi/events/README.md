# Meshio — event schemas (v1)

JSON Schema (draft 2020-12) for the webhook events Meshio delivers to integrators.

- `envelope.schema.json`: outbound envelope `{event_id, event_type, occurred_at, business_id, channel_id, data}`; dispatches `data` validation by `event_type`.
- `data/<event_type>.schema.json`: `data` for each event type (`channel.common.schema.json` is shared by `channel.connected/attention_required/disconnected`; `billing.allowance.common.schema.json` by `billing.allowance_warning/allowance_exhausted`).
- `examples/`: valid payloads (one per type, plus `message.received.business_app_echo`, `message.received.interactive_reply` and `message.status_changed.failed`).

The `$id` URIs are identifiers only (not hosted); load all files into a local registry to resolve `$ref`. Schemas allow additional properties: consumers must ignore unknown fields and unknown enum values added in compatible releases.

## Billing events (number subscription, ADR-019)

All `billing.*` events are about the integrator account: envelope `business_id` and `channel_id` are `null`. Money fields are integer strings in micros (R$ 1 = `"1000000"`); invoice totals are whole cents. Ids: `cyc_` (cycle), `inv_` (invoice), `sub_` (subscription).

| Event | When | `data` (required) |
|---|---|---|
| `billing.allowance_warning` | 80% of the cycle message allowance used (once per cycle). | `cycle_id`, `included_messages`, `used_messages`, `percent`, `cycle_ends_at` (+ `cycle_kind`) |
| `billing.allowance_exhausted` | 100% of the cycle allowance used (once per cycle); sends get `402 ALLOWANCE_EXHAUSTED` without authorized overage. | same as above |
| `billing.overage_limit_reached` | Authorized overage reached its BRL limit for the cycle (once per cycle). | `cycle_id`, `overage_limit_micros`, `overage_used_micros` |
| `billing.invoice_created` | Invoice issued (`kind`: `subscription`, `seat_addition`, `overage`). | `invoice_id`, `kind`, `total_micros`, `due_at` (+ `subscription_id`, `checkout_url`) |
| `billing.invoice_paid` | Invoice payment confirmed (`paid_via`: `pix`, `card`, `wallet`, `manual`). | `invoice_id`, `kind`, `total_micros`, `paid_at`, `paid_via` |
| `billing.invoice_past_due` | Invoice past due; after `grace_until` sends get `402 SUBSCRIPTION_PAST_DUE`. | `invoice_id`, `total_micros`, `due_at`, `grace_until` |
| `billing.subscription_updated` | Subscription changed (`action`, same values as the subscription change log). | `subscription_id`, `status`, `seats`, `cancel_at_period_end`, `action` (+ `scheduled_seats`, `current_period_end`) |
| `billing.trial_ending` | Free trial ends in 3 days (once). | `ends_at`, `days_left`, `message_limit`, `used_messages` |
| `billing.trial_ended` | Free trial ended; sends get `402 SUBSCRIPTION_REQUIRED` (`trial_ended`) until subscribing. No automatic charge. | `ended_at` |

Removed with the number subscription (no longer emitted; schemas deleted): `billing.balance_low`, `billing.balance_added`, `billing.charges_pending`, `channel.billing_past_due`, `channel.billing_suspended`, `channel.billing_resumed`, `business.allowance_warning`, `business.allowance_reached`. Endpoint subscriptions to `business.allowance_*` are migrated to `billing.allowance_*`; the others are removed (audited).

Delivery semantics (signature, retries, dedupe by `event_id`) are documented in `../../docs/developer/webhooks.md`.
