# Meshio — event schemas (v1)

JSON Schema (draft 2020-12) for the webhook events Meshio delivers to integrators.

- `envelope.schema.json`: outbound envelope `{event_id, event_type, occurred_at, business_id, channel_id, data}`; dispatches `data` validation by `event_type`.
- `data/<event_type>.schema.json`: `data` for each event type (`channel.common.schema.json` is shared by `channel.connected/attention_required/disconnected`; `channel.billing.common.schema.json` by `channel.billing_*`; `business.allowance.common.schema.json` by `business.allowance_*`).
- `examples/`: valid payloads (one per type, plus `message.received.business_app_echo`, `message.received.interactive_reply` and `message.status_changed.failed`).

The `$id` URIs are identifiers only (not hosted); load all files into a local registry to resolve `$ref`. Schemas allow additional properties: consumers must ignore unknown fields and unknown enum values added in compatible releases.

Delivery semantics (signature, retries, dedupe by `event_id`) are documented in `../../docs/developer/webhooks.md`.
