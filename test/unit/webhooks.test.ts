import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import Meshio, {
  WebhookVerificationError,
  computeSignature,
  isEventType,
  verify,
} from '../../src/index.js';

interface Vector {
  name: string;
  secret: string;
  timestamp: number;
  now: number;
  body: string;
  signature: string;
  valid: boolean;
}
const fixture = JSON.parse(
  readFileSync(new URL('../fixtures-webhook-signatures.json', import.meta.url), 'utf8'),
) as { tolerance_seconds: number; vectors: Vector[] };

describe('webhooks.verify — vetores compartilhados', () => {
  for (const v of fixture.vectors) {
    it(`${v.name} → ${v.valid ? 'válido' : 'inválido'}`, () => {
      const headers = {
        'Meshio-Timestamp': String(v.timestamp),
        'Meshio-Signature': v.signature,
        'Meshio-Event-Id': 'evt_01test',
      };
      const run = () =>
        verify(v.body, headers, v.secret, { tolerance: fixture.tolerance_seconds, now: v.now });
      if (v.valid) expect(run().event_id).toBe('evt_01test');
      else expect(run).toThrow(WebhookVerificationError);
    });
  }
});

describe('webhooks — comportamento', () => {
  const v = fixture.vectors[0]!;
  const lower = { 'meshio-timestamp': String(v.timestamp), 'meshio-signature': v.signature };

  it('aceita cabeçalhos sem diferenciar maiúsculas, Headers e bytes', () => {
    expect(verify(v.body, lower, v.secret, { now: v.now }).event_type).toBe('webhook.test');
    const h = new Headers(lower);
    const bytes = new TextEncoder().encode(v.body);
    expect(Meshio.webhooks.verify(bytes, h, v.secret, { now: v.now }).event_id).toBe('evt_01test');
    const m = new Meshio({ apiKey: 'msk_test_x' });
    expect(m.webhooks.constructEvent(v.body, h, v.secret, { now: v.now }).event_id).toBe(
      'evt_01test',
    );
  });

  it('computeSignature reproduz o vetor', () => {
    expect(computeSignature(v.body, v.timestamp, v.secret)).toBe(v.signature);
  });

  it('rejeita cabeçalhos ausentes e assinatura malformada', () => {
    expect(() => verify(v.body, {}, v.secret)).toThrow(/Meshio-Timestamp/);
    expect(() =>
      verify(
        v.body,
        { 'meshio-timestamp': String(v.timestamp), 'meshio-signature': 'v1=zz' },
        v.secret,
        {
          now: v.now,
        },
      ),
    ).toThrow(WebhookVerificationError);
  });

  it('usa o relógio real por padrão (timestamp antigo é rejeitado)', () => {
    expect(() => verify(v.body, lower, v.secret)).toThrow(/tolerância/);
  });

  it('eventos de cobrança novos são reconhecidos', () => {
    const ts = 1_800_000_000;
    const body = readFileSync(
      new URL('../../openapi/events/examples/billing.allowance_exhausted.json', import.meta.url),
      'utf8',
    );
    const ev = verify(
      body,
      { 'Meshio-Timestamp': String(ts), 'Meshio-Signature': computeSignature(body, ts, 'whsec_x') },
      'whsec_x',
      { now: ts },
    );
    expect(isEventType(ev, 'billing.allowance_exhausted')).toBe(true);
    if (isEventType(ev, 'billing.allowance_exhausted')) {
      expect(ev.data.percent).toBe(100);
      expect(ev.data.cycle_id).toMatch(/^cyc_/);
    }
  });

  it('tipos desconhecidos não quebram e isEventType restringe', () => {
    const ts = 1_800_000_000;
    const body = JSON.stringify({ event_id: 'evt_1', event_type: 'future.thing', data: { a: 1 } });
    const ev = verify(
      body,
      { 'Meshio-Timestamp': String(ts), 'Meshio-Signature': computeSignature(body, ts, 'whsec_x') },
      'whsec_x',
      { now: ts },
    );
    expect(ev.event_type).toBe('future.thing');
    expect(isEventType(ev, 'message.received')).toBe(false);
  });
});
