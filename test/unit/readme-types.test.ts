import type { IncomingHttpHeaders } from 'node:http';
import { describe, expectTypeOf, it } from 'vitest';
import { type WebhookEvent, isEventType, verify } from '../../src/index.js';

describe('tipos de eventos', () => {
  it('estreita data por event_type', () => {
    const fn = (body: Buffer, headers: IncomingHttpHeaders) => {
      const event: WebhookEvent = verify(body, headers, 'whsec_x');
      if (isEventType(event, 'message.received')) {
        expectTypeOf(event.data.from).toEqualTypeOf<string>();
      }
    };
    expectTypeOf(fn).toBeFunction();
  });
});
