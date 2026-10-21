import type { IncomingHttpHeaders } from 'node:http';
import { describe, expectTypeOf, it } from 'vitest';
import { type KnownEventType, type WebhookEvent, isEventType, verify } from '../../src/index.js';

describe('tipos de eventos', () => {
  it('estreita data por event_type', () => {
    const fn = (body: Buffer, headers: IncomingHttpHeaders) => {
      const event: WebhookEvent = verify(body, headers, 'whsec_x');
      if (isEventType(event, 'message.received')) {
        expectTypeOf(event.data.from).toEqualTypeOf<string>();
      }
      if (isEventType(event, 'billing.invoice_paid')) {
        expectTypeOf(event.data.invoice_id).toEqualTypeOf<string>();
      }
    };
    expectTypeOf(fn).toBeFunction();
  });

  it('eventos removidos não fazem parte dos tipos conhecidos', () => {
    expectTypeOf<'billing.balance_low'>().not.toMatchTypeOf<KnownEventType>();
    expectTypeOf<'channel.billing_suspended'>().not.toMatchTypeOf<KnownEventType>();
    expectTypeOf<'business.allowance_reached'>().not.toMatchTypeOf<KnownEventType>();
    expectTypeOf<'billing.allowance_exhausted'>().toMatchTypeOf<KnownEventType>();
  });
});
