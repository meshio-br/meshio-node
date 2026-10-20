import { type ClientOptions, HttpClient } from './core.js';
import { Billing, Compliance, Consents, OptOuts, Usage } from './resources/account-resources.js';
import {
  Businesses,
  Channels,
  ConnectLinks,
  Conversations,
  Messages,
  Templates,
  Version,
} from './resources/core-resources.js';
import { Events, WebhookDeliveries, WebhookEndpoints } from './resources/webhook-resources.js';
import { webhooks } from './webhooks.js';

/**
 * Cliente da API Meshio.
 *
 * ```ts
 * import Meshio from '@meshio/sdk';
 * const meshio = new Meshio({ apiKey: process.env.MESHIO_API_KEY });
 * ```
 */
export class Meshio {
  /** Verificação de assinaturas de webhook (também disponível como `Meshio.webhooks`). */
  static readonly webhooks = webhooks;
  readonly webhooks = webhooks;

  /** Cliente HTTP de baixo nível (útil para chamadas ainda não cobertas). */
  readonly http: HttpClient;

  readonly version: Version;
  readonly businesses: Businesses;
  readonly channels: Channels;
  readonly connectLinks: ConnectLinks;
  readonly messages: Messages;
  readonly conversations: Conversations;
  readonly templates: Templates;
  readonly webhookEndpoints: WebhookEndpoints;
  readonly webhookDeliveries: WebhookDeliveries;
  readonly events: Events;
  readonly usage: Usage;
  readonly compliance: Compliance;
  readonly consents: Consents;
  readonly optOuts: OptOuts;
  readonly billing: Billing;

  constructor(options: ClientOptions = {}) {
    const http = new HttpClient(options);
    this.http = http;
    this.version = new Version(http);
    this.businesses = new Businesses(http);
    this.channels = new Channels(http);
    this.connectLinks = new ConnectLinks(http);
    this.messages = new Messages(http);
    this.conversations = new Conversations(http);
    this.templates = new Templates(http);
    this.webhookEndpoints = new WebhookEndpoints(http);
    this.webhookDeliveries = new WebhookDeliveries(http);
    this.events = new Events(http);
    this.usage = new Usage(http);
    this.compliance = new Compliance(http);
    this.consents = new Consents(http);
    this.optOuts = new OptOuts(http);
    this.billing = new Billing(http);
  }
}
