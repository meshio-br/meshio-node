/* Arquivo gerado por scripts/generate-events.mjs. Não edite manualmente. */

/**
 * Allowance exhausted (100% of the cycle allowance): new sends are refused with 402 ALLOWANCE_EXHAUSTED unless overage is available and authorized. Same data as billing.allowance.common.schema.json.
 */
export type BillingAllowanceExhaustedData = DataForBillingAllowanceWarningAndBillingAllowanceExhausted;

/**
 * The integrator used 80% (billing.allowance_warning) or 100% (billing.allowance_exhausted) of the message allowance of the current cycle. The allowance belongs to the integrator and is shared by all its numbers; it does not accumulate between cycles. Each event is sent at most once per cycle. While exhausted and without authorized overage, POST /v1/messages answers 402 ALLOWANCE_EXHAUSTED; inbound messages keep being received. Envelope business_id and channel_id are null.
 */
export interface DataForBillingAllowanceWarningAndBillingAllowanceExhausted {
  /**
   * Billing cycle id.
   */
  cycle_id: string;
  /**
   * trial = free trial cycle; paid = subscription cycle.
   */
  cycle_kind?: "trial" | "paid";
  /**
   * Messages included in the cycle, shared by all numbers of the integrator (base + prorated seat additions).
   */
  included_messages: number;
  /**
   * Messages counted in the cycle (sent and delivered or read + new inbound).
   */
  used_messages: number;
  /**
   * floor(used_messages / included_messages * 100); may exceed 100 (inbound messages are always received and counted).
   */
  percent: number;
  /**
   * End of the cycle (renewal or trial end), when the allowance renews.
   */
  cycle_ends_at: string;
  [k: string]: unknown;
}

/**
 * Allowance warning (80% of the cycle allowance). Same data as billing.allowance.common.schema.json.
 */
export type BillingAllowanceWarningData = DataForBillingAllowanceWarningAndBillingAllowanceExhausted;

/**
 * The integrator used 80% (billing.allowance_warning) or 100% (billing.allowance_exhausted) of the message allowance of the current cycle. The allowance belongs to the integrator and is shared by all its numbers; it does not accumulate between cycles. Each event is sent at most once per cycle. While exhausted and without authorized overage, POST /v1/messages answers 402 ALLOWANCE_EXHAUSTED; inbound messages keep being received. Envelope business_id and channel_id are null.
 */
/**
 * An invoice was issued: the monthly fee of a cycle (issued before the renewal), prorated seats added mid-cycle or the overage of a closed cycle. Pay it through checkout_url (payment link) or, with consent, with the preserved paid balance. Envelope business_id and channel_id are null.
 */
export interface BillingInvoiceCreatedData {
  invoice_id: string;
  subscription_id?: string;
  /**
   * subscription = monthly fee of the cycle; seat_addition = prorated seats added mid-cycle; overage = messages above the allowance (only with a published price and the integrator's authorization).
   */
  kind: "subscription" | "seat_addition" | "overage";
  /**
   * Invoice total (multiple of 10000: whole cents). Integer string in micros (R$ 1 = "1000000").
   */
  total_micros: string;
  /**
   * Due date.
   */
  due_at: string;
  /**
   * Payment link (Pix or card); null when the invoice is paid with the preserved balance or the link is not generated yet.
   */
  checkout_url?: string | null;
  [k: string]: unknown;
}

/**
 * Payment of an invoice was confirmed (re-read from the payment provider, paid with the preserved balance or registered by Meshio). Envelope business_id and channel_id are null.
 */
export interface BillingInvoicePaidData {
  invoice_id: string;
  subscription_id?: string;
  /**
   * subscription = monthly fee of the cycle; seat_addition = prorated seats added mid-cycle; overage = messages above the allowance (only with a published price and the integrator's authorization).
   */
  kind: "subscription" | "seat_addition" | "overage";
  /**
   * Invoice total. Integer string in micros (R$ 1 = "1000000").
   */
  total_micros: string;
  /**
   * Payment confirmation time.
   */
  paid_at: string;
  /**
   * wallet = preserved paid balance (opt-in); manual = registered by Meshio.
   */
  paid_via: "pix" | "card" | "wallet" | "manual";
  [k: string]: unknown;
}

/**
 * An invoice is past due and unpaid: the subscription becomes past_due. After grace_until, new sends answer 402 SUBSCRIPTION_PAST_DUE until the invoice is paid; inbound messages, delivery events and webhooks never stop. Envelope business_id and channel_id are null.
 */
export interface BillingInvoicePastDueData {
  invoice_id: string;
  subscription_id?: string;
  /**
   * subscription = monthly fee of the cycle; seat_addition = prorated seats added mid-cycle; overage = messages above the allowance (only with a published price and the integrator's authorization).
   */
  kind?: "subscription" | "seat_addition" | "overage";
  /**
   * Invoice total. Integer string in micros (R$ 1 = "1000000").
   */
  total_micros: string;
  /**
   * Due date.
   */
  due_at: string;
  /**
   * End of the grace period; new sends are blocked from then on.
   */
  grace_until: string;
  [k: string]: unknown;
}

/**
 * The authorized overage reached the integrator's BRL limit for the cycle: new sends above the allowance are refused with 402 ALLOWANCE_EXHAUSTED (reason overage_limit_reached). Sent at most once per cycle. Envelope business_id and channel_id are null.
 */
export interface BillingOverageLimitReachedData {
  /**
   * Billing cycle id.
   */
  cycle_id: string;
  /**
   * Overage limit authorized for the cycle. Integer string in micros (R$ 1 = "1000000").
   */
  overage_limit_micros: string;
  /**
   * Overage already counted in the cycle (sends awaiting delivery included). Integer string in micros (R$ 1 = "1000000").
   */
  overage_used_micros: string;
  [k: string]: unknown;
}

/**
 * The integrator's subscription changed (activated, seats added, reduction scheduled or canceled, cancellation scheduled or reverted, canceled, overage or payment method updated, past due, reactivated). action names the change; the other fields are the subscription after it. Envelope business_id and channel_id are null.
 */
export interface BillingSubscriptionUpdatedData {
  subscription_id: string;
  status: "incomplete" | "active" | "past_due" | "canceled";
  /**
   * Contracted seats (billable numbers).
   */
  seats: number;
  /**
   * Seat reduction scheduled for the next renewal; null when none.
   */
  scheduled_seats?: number | null;
  /**
   * End of the current paid cycle; null before the first payment.
   */
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  action:
    | "created"
    | "activated"
    | "seats_added"
    | "seats_reduction_scheduled"
    | "seats_reduction_canceled"
    | "cancel_scheduled"
    | "cancel_reverted"
    | "canceled"
    | "overage_updated"
    | "payment_method_updated"
    | "past_due"
    | "reactivated";
  [k: string]: unknown;
}

/**
 * The free trial ended. There is no automatic charge: new sends answer 402 SUBSCRIPTION_REQUIRED (reason trial_ended) until the integrator subscribes; inbound messages keep being received. A trial never restarts. Envelope business_id and channel_id are null.
 */
export interface BillingTrialEndedData {
  /**
   * Billing cycle id.
   */
  cycle_id?: string;
  /**
   * End of the trial.
   */
  ended_at: string;
  [k: string]: unknown;
}

/**
 * The integrator's free trial ends soon (sent once, 3 days before the end). There is no automatic charge: to keep sending after the trial, subscribe. Envelope business_id and channel_id are null.
 */
export interface BillingTrialEndingData {
  /**
   * Billing cycle id.
   */
  cycle_id?: string;
  /**
   * End of the trial.
   */
  ends_at: string;
  days_left: number;
  /**
   * Messages included in the trial.
   */
  message_limit: number;
  /**
   * Messages counted in the trial so far.
   */
  used_messages: number;
  [k: string]: unknown;
}

/**
 * Meshio suspended (state=active) or released (state=lifted) all sends of a business (customer) for compliance. Automatic holds come from Meta signals: account_update violation/restriction/ban/disable, 3+ templates paused in 7 days or 20+ Meta policy errors (131048, 131049, 368, 470) in 24 h; operators may also hold manually. While active, sends and new templates for the business are refused with 422 POLICY_BLOCKED (reason business_suspended) without calling Meta. Only a Meshio operator can lift a hold.
 */
export interface BusinessComplianceHoldData {
  hold_id: string;
  state: "active" | "lifted";
  scope: "business";
  business_id: string;
  reason:
    | "meta_account_violation"
    | "meta_account_restriction"
    | "meta_account_banned"
    | "meta_account_disabled"
    | "templates_paused"
    | "meta_policy_errors"
    | "manual";
  source: "meta_signal" | "operator" | "policy";
  /**
   * Short explanation in pt-BR.
   */
  message: string;
  created_at: string;
  lifted_at: string | null;
  [k: string]: unknown;
}

/**
 * Channel needs action (revoked token, lost scope, failed health check, quality problem). Sends are blocked until the channel returns to active.
 */
export type ChannelAttentionRequiredData = ChannelSnapshotSharedByChannelEvents & {
  status: "attention_required";
  status_reason: string;
  [k: string]: unknown;
};

export interface ChannelSnapshotSharedByChannelEvents {
  channel_id: string;
  business_id: string;
  mode: "cloud_api" | "coexistence";
  status:
    | "not_started"
    | "pending_authorization"
    | "pending_setup"
    | "active"
    | "attention_required"
    | "disconnected"
    | "revoked";
  previous_status:
    | "not_started"
    | "pending_authorization"
    | "pending_setup"
    | "active"
    | "attention_required"
    | "disconnected"
    | "revoked"
    | null;
  /**
   * Machine-readable reason (e.g. meta_auth_revoked, health_check_failed); null when not applicable.
   */
  status_reason: string | null;
  /**
   * Who caused the transition.
   */
  source?: "user" | "meta" | "system" | "health_check";
  /**
   * Business phone number as reported by Meta.
   */
  display_phone_number?: string | null;
  verified_name?: string | null;
  waba_id?: string | null;
  phone_number_id?: string | null;
  quality_rating?: string | null;
  capabilities: {
    send_text: boolean;
    send_template: boolean;
    receive: boolean;
    business_app_echoes: boolean;
    history_sync: boolean;
    [k: string]: boolean;
  };
  environment: "simulator" | "live";
  [k: string]: unknown;
}

/**
 * Meshio suspended (state=active) or released (state=lifted) sends of one WhatsApp number for compliance. Automatic holds happen when Meta's quality rating of the number turns RED; operators may also hold manually. While active, sends and new templates on the number are refused with 422 POLICY_BLOCKED (reason channel_compliance_hold) without calling Meta. Only a Meshio operator can lift a hold.
 */
export interface ChannelComplianceHoldData {
  hold_id: string;
  state: "active" | "lifted";
  scope: "channel";
  business_id: string;
  channel_id: string;
  display_phone_number: string | null;
  reason: "quality_red" | "manual";
  source: "meta_signal" | "operator" | "policy";
  /**
   * Short explanation in pt-BR.
   */
  message: string;
  created_at: string;
  lifted_at: string | null;
  [k: string]: unknown;
}

/**
 * Emitted only after the backend validated the Meta authorization, subscribed the app to the WABA and verified the phone number.
 */
export type ChannelConnectedData = ChannelSnapshotSharedByChannelEvents & {
  status: "active";
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string;
  /**
   * Present when the business owner connected the number through a hosted connection link (POST /v1/connect-links).
   */
  connect_link_id?: string;
  [k: string]: unknown;
};

/**
 * Channel disconnected by a user/system or revoked on Meta. New sends are rejected with CHANNEL_NOT_ACTIVE. History is not deleted by disconnection.
 */
export type ChannelDisconnectedData = ChannelSnapshotSharedByChannelEvents & {
  status: "disconnected" | "revoked";
  [k: string]: unknown;
};

/**
 * Meta health of a WhatsApp number changed: the sending status reported by Meta (health_status.can_send_message) changed, or the quality rating dropped (GREEN to YELLOW/RED, YELLOW to RED). The first reading only emits when the number is already limited or blocked. Read by the channel health check (every 30 minutes and after Meta quality webhooks).
 */
export interface ChannelHealthChangedData {
  channel_id: string;
  business_id: string;
  display_phone_number: string | null;
  /**
   * available: meets all requirements; limited: sends with limitations (see reason); blocked: Meta rejects sends from this number. null = not read yet.
   */
  can_send: "available" | "limited" | "blocked" | null;
  previous_can_send: "available" | "limited" | "blocked" | null;
  /**
   * First error description (blocked) or additional info (limited) sent by Meta, verbatim (usually English). null when available.
   */
  reason: string | null;
  /**
   * Meta quality rating: GREEN, YELLOW, RED, NA or UNKNOWN.
   */
  quality_rating: string | null;
  previous_quality_rating: string | null;
  /**
   * Display name review: APPROVED, AVAILABLE_WITHOUT_REVIEW, DECLINED, EXPIRED, PENDING_REVIEW or NONE.
   */
  name_status: string | null;
  /**
   * Meta messaging limit tier (whatsapp_business_manager_messaging_limit), e.g. TIER_250, TIER_2K, TIER_10K, TIER_100K, TIER_UNLIMITED.
   */
  messaging_limit: string | null;
  /**
   * Since v0.13.0. Explained health: available (no Meta restriction); limited (sends normally up to the messaging limit for business-initiated conversations); initiate_blocked (replies within 24 hours work, templates are refused, e.g. payment method issue); blocked (Meta blocks sending); unknown (health not read yet).
   */
  state?: "available" | "limited" | "initiate_blocked" | "blocked" | "unknown";
  /**
   * Since v0.13.0. One pt-BR sentence explaining what the number can do now (same text as the panel).
   */
  headline?: string;
  [k: string]: unknown;
}

/**
 * A contact left the business opt-out list: they sent VOLTAR/START on WhatsApp (source=keyword; a consent with source whatsapp is recorded), a consent captured after the opt-out was registered (source=consent), or the integrator removed them via DELETE /v1/opt-outs or the panel (source=api|panel).
 */
export interface ContactOptedInData {
  business_id: string;
  channel_id?: string | null;
  /**
   * Contact phone in E.164.
   */
  phone: string;
  source: "keyword" | "consent" | "api" | "panel";
  /**
   * VOLTAR or START when source=keyword.
   */
  keyword?: string | null;
  /**
   * Consent that lifted the opt-out (source=consent).
   */
  consent_id?: string | null;
  opted_in_at: string;
  [k: string]: unknown;
}

/**
 * A contact joined the business opt-out (suppression) list: they sent SAIR/PARAR/STOP/CANCELAR/DESCADASTRAR/REMOVER on WhatsApp (source=keyword), or the integrator added them via POST /v1/opt-outs or the panel. From now on Meshio refuses templates to this contact from this business (POLICY_BLOCKED recipient_opted_out) and revokes the live consent. Emitted once per entry.
 */
export interface ContactOptedOutData {
  business_id: string;
  /**
   * Channel that received the keyword (null for API/panel).
   */
  channel_id?: string | null;
  /**
   * Contact phone in E.164.
   */
  phone: string;
  source: "keyword" | "api" | "panel";
  /**
   * Keyword received, upper case (e.g. SAIR), when source=keyword.
   */
  keyword?: string | null;
  opt_out_id: string;
  opted_out_at: string;
  [k: string]: unknown;
}

/**
 * Meshio refused a send before calling Meta (the API answered 422 POLICY_BLOCKED; no message was created and no credits were reserved). Use `reason` (stable code) and `message` (pt-BR) to fix the cause. The content is never included.
 */
export interface MessagePolicyBlockedData {
  decision_id: string;
  business_id: string;
  channel_id: string;
  /**
   * Contact phone in E.164.
   */
  to: string;
  type: "text" | "template";
  template?: {
    name: string;
    language: string;
    [k: string]: unknown;
  } | null;
  /**
   * New reasons may be added; treat unknown values as a generic policy refusal.
   */
  reason:
    | "integrator_not_approved"
    | "business_suspended"
    | "business_not_verified"
    | "channel_compliance_hold"
    | "recipient_opted_out"
    | "opt_in_required"
    | "link_not_allowed"
    | "link_malicious"
    | "content_suspected_scam"
    | "volume_limit_reached";
  rule: "trust" | "opt_out" | "opt_in" | "links" | "scam" | "volume";
  /**
   * Explanation in pt-BR (same as the API error).
   */
  message: string;
  /**
   * Structured details, e.g. link_issue and host (links), score and signals (scam), limit/daily_cap/retry_after_seconds (volume).
   */
  details?: {
    [k: string]: unknown;
  };
  client_reference?: string | null;
  blocked_at: string;
  [k: string]: unknown;
}

/**
 * A message from a contact (direction=inbound, origin=customer) or, on coexistence channels, an echo of a message sent from the WhatsApp Business App (direction=outbound, origin=business_app). Never auto-reply unless direction=inbound AND origin=customer.
 */
export type MessageReceivedData = {
  [k: string]: unknown;
} & {
  message_id: string;
  direction: "inbound" | "outbound";
  origin: "customer" | "business_app" | "unknown";
  /**
   * `interactive_reply` (since v0.14.0): the contact tapped a template quick reply button or answered an interactive message; see `reply`. New types may be added; treat unknown values as unsupported.
   */
  type: "text" | "template" | "interactive_reply" | "unsupported";
  /**
   * E.164 sender.
   */
  from: string;
  /**
   * E.164 recipient.
   */
  to: string;
  text?: {
    body: string;
    [k: string]: unknown;
  } | null;
  /**
   * Click data for type=interactive_reply (null otherwise).
   */
  reply?: {
    /**
     * template_quick_reply: quick reply button of a template (Meta type=button); button_reply/list_reply: reply to an interactive message.
     */
    kind: "template_quick_reply" | "button_reply" | "list_reply";
    /**
     * Button payload (template quick reply) or the reply/row id (interactive).
     */
    id?: string | null;
    /**
     * Text the contact saw and tapped.
     */
    title: string;
    /**
     * List row description (list_reply only).
     */
    description?: string | null;
    [k: string]: unknown;
  } | null;
  /**
   * Message the contact replied to (Meta context.id): quoted replies and button clicks.
   */
  context?: {
    meta_message_id: string;
    /**
     * Meshio id when the replied message belongs to this integrator.
     */
    message_id?: string | null;
    type?: string | null;
    /**
     * Template of the replied message, when it was a template.
     */
    template_name?: string | null;
    [k: string]: unknown;
  } | null;
  /**
   * WhatsApp profile name of the contact when provided by Meta.
   */
  contact_name?: string | null;
  meta_message_id?: string | null;
  meta_timestamp?: string | null;
  /**
   * True for messages from coexistence history sync (best effort); do not treat as new.
   */
  imported?: boolean;
  [k: string]: unknown;
};

/**
 * Forward-only status change of an outbound message. Ranks: queued 0, sending 1, unknown 1, accepted_by_meta 2, delivered 3, read 4; failed is terminal and may follow any rank <= 3. Events may arrive out of order: never regress.
 */
export type MessageStatusChangedData = {
  [k: string]: unknown;
} & {
  message_id: string;
  direction: "outbound";
  origin: "api" | "panel" | "business_app" | "unknown";
  type?: "text" | "template" | "unsupported";
  status: "queued" | "sending" | "accepted_by_meta" | "delivered" | "read" | "failed" | "canceled" | "unknown";
  previous_status:
    "queued" | "sending" | "accepted_by_meta" | "delivered" | "read" | "failed" | "canceled" | "unknown" | null;
  to: string;
  client_reference?: string | null;
  meta_message_id?: string | null;
  /**
   * Time reported by Meta for this status, when available.
   */
  meta_occurred_at?: string | null;
  error?: {
    /**
     * Safe Meshio error code (UPPER_SNAKE_CASE). Values in examples are illustrative; original Meta codes stay in restricted diagnostics.
     */
    code: string;
    message: string;
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
};

/**
 * Template status changed on Meta (source of truth). Only status=approved templates can be sent. Since v0.12.0 a template held for Meshio review (pending_review) that a Meshio operator refuses changes to rejected with a rejection_reason starting with 'Recusado pela Meshio: '.
 */
export interface TemplateStatusChangedData {
  template_id: string;
  meta_template_id?: string | null;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  status: "draft" | "pending_review" | "pending" | "approved" | "rejected" | "paused" | "disabled" | "deleted";
  previous_status:
    "draft" | "pending_review" | "pending" | "approved" | "rejected" | "paused" | "disabled" | "deleted" | null;
  rejection_reason?: string | null;
  [k: string]: unknown;
}

/**
 * Sent by POST /v1/webhook-endpoints/{id}/test to validate reachability and signature verification. Envelope business_id and channel_id are null.
 */
export interface WebhookTestData {
  endpoint_id: string;
  message?: string;
  [k: string]: unknown;
}

/** Mapa event_type → tipo de `data`. */
export interface EventDataMap {
  'billing.allowance_exhausted': BillingAllowanceExhaustedData;
  'billing.allowance_warning': BillingAllowanceWarningData;
  'billing.invoice_created': BillingInvoiceCreatedData;
  'billing.invoice_paid': BillingInvoicePaidData;
  'billing.invoice_past_due': BillingInvoicePastDueData;
  'billing.overage_limit_reached': BillingOverageLimitReachedData;
  'billing.subscription_updated': BillingSubscriptionUpdatedData;
  'billing.trial_ended': BillingTrialEndedData;
  'billing.trial_ending': BillingTrialEndingData;
  'business.compliance_hold': BusinessComplianceHoldData;
  'channel.attention_required': ChannelAttentionRequiredData;
  'channel.compliance_hold': ChannelComplianceHoldData;
  'channel.connected': ChannelConnectedData;
  'channel.disconnected': ChannelDisconnectedData;
  'channel.health_changed': ChannelHealthChangedData;
  'contact.opted_in': ContactOptedInData;
  'contact.opted_out': ContactOptedOutData;
  'message.policy_blocked': MessagePolicyBlockedData;
  'message.received': MessageReceivedData;
  'message.status_changed': MessageStatusChangedData;
  'template.status_changed': TemplateStatusChangedData;
  'webhook.test': WebhookTestData;
}
