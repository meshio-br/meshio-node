/* Arquivo gerado por scripts/generate-events.mjs. Não edite manualmente. */

/**
 * Money entered the integrator's BRL wallet: a confirmed top-up, a top-up bonus or trial promotional balance, an opening balance or a positive operator adjustment. Envelope business_id and channel_id are null.
 */
export interface BillingBalanceAddedData {
  entry_id: string;
  kind: "topup" | "bonus" | "opening_balance" | "adjustment" | "chargeback_reversal";
  /**
   * Amount added. Integer string in micros (R$ 1 = "1000000").
   */
  amount_micros: string;
  /**
   * Wallet balance after the entry. Integer string in micros (R$ 1 = "1000000").
   */
  balance_micros: string;
  /**
   * Available after the entry. Integer string in micros (R$ 1 = "1000000").
   */
  available_micros: string;
  /**
   * Top-up that originated the entry (topup and campaign bonus).
   */
  topup_id: string | null;
  [k: string]: unknown;
}

/**
 * The integrator's free BRL balance (balance - reserved - pending) crossed below the configured low-balance threshold. Sent at most once per crossing. Money values are integer strings in micros (millionths of BRL). Envelope business_id and channel_id are null.
 */
export interface BillingBalanceLowData {
  /**
   * Paid + bonus balance. Integer string in micros (R$ 1 = "1000000").
   */
  balance_micros: string;
  /**
   * Reserved for accepted sends awaiting delivery. Integer string in micros (R$ 1 = "1000000").
   */
  reserved_micros: string;
  /**
   * What new sends can still use (balance - reserved - pending + credit limit). Integer string in micros (R$ 1 = "1000000").
   */
  available_micros: string;
  /**
   * Configured alert threshold. Integer string in micros (R$ 1 = "1000000").
   */
  low_balance_threshold_micros: string;
  /**
   * Same as balance_micros as an exact decimal BRL string, e.g. "12.5".
   */
  balance: string;
  [k: string]: unknown;
}

/**
 * Charges (e.g. new inbound messages) could not be debited for lack of balance and were left pending; messages keep being received and delivered. Sent once per episode; pending charges are settled automatically on the next top-up. Envelope business_id and channel_id are null.
 */
export interface BillingChargesPendingData {
  /**
   * Total pending. Integer string in micros (R$ 1 = "1000000").
   */
  pending_micros: string;
  /**
   * Available at the time. Integer string in micros (R$ 1 = "1000000").
   */
  available_micros: string;
  reason: "insufficient_balance";
  [k: string]: unknown;
}

/**
 * The trial period ended: monthly number fees start and the normal model applies. Envelope business_id and channel_id are null.
 */
export interface BillingTrialEndedData {
  ended_at: string;
  [k: string]: unknown;
}

/**
 * The integrator's trial period ends soon (sent N days before and on the last day, once each). Envelope business_id and channel_id are null.
 */
export interface BillingTrialEndingData {
  ends_at: string;
  days_left: number;
  /**
   * Promotional/bonus balance still available. Integer string in micros (R$ 1 = "1000000").
   */
  bonus_balance_micros: string;
  /**
   * Available balance. Integer string in micros (R$ 1 = "1000000").
   */
  available_micros: string;
  [k: string]: unknown;
}

/**
 * Monthly allowance reached (100%). Same data as business.allowance.common.schema.json.
 */
export type BusinessAllowanceReachedData = DataForBusinessAllowanceWarningAndBusinessAllowanceReached;

/**
 * A business (customer) used 80% (business.allowance_warning) or 100% (business.allowance_reached) of the monthly allowance set by the integrator. Usage = Meshio charges of the business's messages (sent and delivered + new inbound, including charges pending for balance) plus sends awaiting delivery, in the calendar month of America/Sao_Paulo; number fees do not count. Each event is sent at most once per business per month (crossing both thresholds at once sends only business.allowance_reached); changing the allowance re-arms the thresholds that end up above the usage. While reached, POST /v1/messages for the business's channels answers 402 BUSINESS_ALLOWANCE_REACHED; inbound messages keep being received. Envelope business_id = the business; channel_id is null.
 */
export interface DataForBusinessAllowanceWarningAndBusinessAllowanceReached {
  business_id: string;
  /**
   * Month YYYY-MM (America/Sao_Paulo).
   */
  period: string;
  /**
   * Usage in the month. Integer string in micros (R$ 1 = "1000000").
   */
  used_micros: string;
  /**
   * Monthly allowance. Integer string in micros.
   */
  allowance_micros: string;
  /**
   * floor(used / allowance * 100); may exceed 100 (inbound messages are always charged).
   */
  percent: number;
  /**
   * First day of the next month (YYYY-MM-DD), when usage resets.
   */
  resets_at?: string;
  [k: string]: unknown;
}

/**
 * Monthly allowance warning (80%). Same data as business.allowance.common.schema.json.
 */
export type BusinessAllowanceWarningData = DataForBusinessAllowanceWarningAndBusinessAllowanceReached;

/**
 * A business (customer) used 80% (business.allowance_warning) or 100% (business.allowance_reached) of the monthly allowance set by the integrator. Usage = Meshio charges of the business's messages (sent and delivered + new inbound, including charges pending for balance) plus sends awaiting delivery, in the calendar month of America/Sao_Paulo; number fees do not count. Each event is sent at most once per business per month (crossing both thresholds at once sends only business.allowance_reached); changing the allowance re-arms the thresholds that end up above the usage. While reached, POST /v1/messages for the business's channels answers 402 BUSINESS_ALLOWANCE_REACHED; inbound messages keep being received. Envelope business_id = the business; channel_id is null.
 */
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
 * A monthly number fee could not be debited (available credits below the fee). The number keeps working during a 3-day grace period (grace_until); the charge is retried every 15 minutes and right after credits are added.
 */
export type ChannelBillingPastDueData = SharedDataForChannelBilling_Events & {
  billing_state?: "grace";
  [k: string]: unknown;
};

/**
 * Monthly fee per WhatsApp number in BRL (monthly anniversary cycle, debited from the prepaid wallet). Envelope business_id and channel_id identify the number. Money values are integer strings in micros (millionths of BRL); timestamps are UTC ISO 8601.
 */
export interface SharedDataForChannelBilling_Events {
  channel_id: string;
  business_id: string;
  mode: "cloud_api" | "coexistence";
  display_phone_number: string | null;
  /**
   * grace: fee overdue but the number still sends until grace_until; suspended: outbound sends answer 402 CHANNEL_BILLING_SUSPENDED (inbound keeps working).
   */
  billing_state: "ok" | "grace" | "suspended";
  /**
   * End of the open cycle (next renewal).
   */
  current_period_end: string | null;
  grace_until: string | null;
  suspended_at: string | null;
  /**
   * Overdue fees of this number (past_due). Integer string in micros (R$ 1 = "1000000").
   */
  amount_due_micros: string;
  /**
   * Wallet available balance at the time of the event. Integer string in micros (R$ 1 = "1000000").
   */
  available_micros: string;
  /**
   * Effective monthly fee for this number (default or custom price). Integer string in micros (R$ 1 = "1000000").
   */
  monthly_fee_micros: string;
  [k: string]: unknown;
}

/**
 * All overdue fees of the number were paid (credits added) or waived by Meshio: sending works again immediately.
 */
export type ChannelBillingResumedData = SharedDataForChannelBilling_Events & {
  billing_state?: "ok";
  [k: string]: unknown;
};

/**
 * Monthly fee per WhatsApp number in BRL (monthly anniversary cycle, debited from the prepaid wallet). Envelope business_id and channel_id identify the number. Money values are integer strings in micros (millionths of BRL); timestamps are UTC ISO 8601.
 */
/**
 * The grace period ended with the fee still overdue: outbound sends through this number now answer 402 CHANNEL_BILLING_SUSPENDED. Inbound messages keep being received and delivered to webhooks; the Meta connection is untouched.
 */
export type ChannelBillingSuspendedData = SharedDataForChannelBilling_Events & {
  billing_state?: "suspended";
  [k: string]: unknown;
};

/**
 * Monthly fee per WhatsApp number in BRL (monthly anniversary cycle, debited from the prepaid wallet). Envelope business_id and channel_id identify the number. Money values are integer strings in micros (millionths of BRL); timestamps are UTC ISO 8601.
 */
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
  'billing.balance_added': BillingBalanceAddedData;
  'billing.balance_low': BillingBalanceLowData;
  'billing.charges_pending': BillingChargesPendingData;
  'billing.trial_ended': BillingTrialEndedData;
  'billing.trial_ending': BillingTrialEndingData;
  'business.allowance_reached': BusinessAllowanceReachedData;
  'business.allowance_warning': BusinessAllowanceWarningData;
  'business.compliance_hold': BusinessComplianceHoldData;
  'channel.attention_required': ChannelAttentionRequiredData;
  'channel.billing_past_due': ChannelBillingPastDueData;
  'channel.billing_resumed': ChannelBillingResumedData;
  'channel.billing_suspended': ChannelBillingSuspendedData;
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
