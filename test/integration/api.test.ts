import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  ConflictError,
  GoneError,
  Meshio,
  MeshioError,
  NotFoundError,
  ValidationError,
  microsToReais,
} from '../../src/index.js';

// Integração contra uma API real (pilha local). Pulados se MESHIO_TEST_API_URL não estiver definido.
const baseUrl = process.env.MESHIO_TEST_API_URL;
const apiKey = process.env.MESHIO_TEST_API_KEY;
const run = Boolean(baseUrl && apiKey);

describe.skipIf(!run)('integração (MESHIO_TEST_API_URL)', () => {
  const meshio = new Meshio({ apiKey, baseUrl, maxRetries: 1 });

  async function first<T>(it: AsyncGenerator<T>): Promise<T | undefined> {
    for await (const x of it) return x;
    return undefined;
  }

  it('version.get', async () => {
    const v = await meshio.version.get();
    expect(typeof v.version).toBe('string');
  });

  it('businesses: list, listAll e get', async () => {
    const page = await meshio.businesses.list({ limit: 1 });
    expect(Array.isArray(page.data)).toBe(true);
    const items = [];
    for await (const b of meshio.businesses.listAll({ limit: 1 })) {
      items.push(b);
      if (items.length >= 2) break;
    }
    if (page.next_cursor) expect(items[1]!.id).not.toBe(items[0]!.id);
    const b = page.data[0];
    if (b) expect((await meshio.businesses.get(b.id)).id).toBe(b.id);
  });

  it('erros tipados: 404, 401 e 422', async () => {
    await expect(meshio.businesses.get('biz_inexistente')).rejects.toBeInstanceOf(NotFoundError);
    const bad = new Meshio({ apiKey: 'msk_test_invalida', baseUrl });
    const err = await bad.version.get().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toMatch(/^req_/);
    const v = await meshio.messages.send({} as never).catch((e) => e);
    expect(v).toBeInstanceOf(ValidationError);
    expect(Object.keys(v.fields)).toContain('channel_id');
  });

  it('channels, histórico e registros da Meta', async () => {
    const ch = await first(meshio.channels.listAll({ limit: 5 }));
    if (!ch) return;
    expect((await meshio.channels.get(ch.id)).id).toBe(ch.id);
    expect(Array.isArray((await meshio.channels.history(ch.id, { limit: 2 })).data)).toBe(true);
    expect(Array.isArray((await meshio.channels.metaLogs.list(ch.id, { limit: 2 })).data)).toBe(
      true,
    );
  });

  it('messages.send: aceito ou erro tipado; idempotência por chave', async () => {
    const ch = await first(meshio.channels.listAll({ limit: 5 }));
    if (!ch) return;
    const key = randomUUID();
    const body = {
      channel_id: ch.id,
      to: '+5511900000000',
      type: 'text' as const,
      text: { body: `teste sdk node ${key}` },
    };
    try {
      const sent = await meshio.messages.send(body, { idempotencyKey: key });
      expect(sent.id).toMatch(/^msg_/);
      const again = await meshio.messages.send(body, { idempotencyKey: key });
      expect(again.id).toBe(sent.id);
      expect(again.idempotent_replay).toBe(true);
      expect((await meshio.messages.get(sent.id)).id).toBe(sent.id);
    } catch (e) {
      // Canal sem capacidade, política ou saldo: precisa ser um erro tipado com código.
      expect(e).toBeInstanceOf(MeshioError);
      expect((e as MeshioError).code).toBeTruthy();
      expect((e as MeshioError).status).toBeGreaterThanOrEqual(400);
    }
  });

  it('listagens de leitura', async () => {
    for (const p of [
      meshio.messages.list({ limit: 2 }),
      meshio.conversations.list({ limit: 2 }),
      meshio.templates.list({ limit: 2 }),
      meshio.connectLinks.list({ limit: 2 }),
      meshio.events.list({ limit: 2 }),
      meshio.webhookDeliveries.list({ limit: 2 }),
      meshio.consents.list({ limit: 2 }),
      meshio.optOuts.list({ limit: 2 }),
      meshio.billing.entries.list({ limit: 2 }),
      meshio.billing.topups.list({ limit: 2 }),
      meshio.billing.invoices.list({ limit: 2 }),
      meshio.billing.cycles.list({ limit: 2 }),
      meshio.billing.allowance.consumptions.list({ limit: 2 }),
    ]) {
      expect(Array.isArray((await p).data)).toBe(true);
    }
    const ev = (await meshio.events.list({ limit: 1 })).data[0];
    if (ev) expect((await meshio.events.get(ev.id)).id).toBe(ev.id);
  });

  it('uso e conformidade', async () => {
    await meshio.usage.get();
    expect(typeof (await meshio.usage.exportCsv())).toBe('string');
    await meshio.usage.overview();
    const status = await meshio.usage.integrationStatus();
    expect(typeof status.billing.subscription_status).toBe('string');
    await meshio.compliance.status();
  });

  it('assinatura: situação, prévia de contratação e de vagas', async () => {
    const sub = await meshio.billing.subscription.get();
    expect(sub.status).toBe('active');
    expect(sub.seats).toBeGreaterThanOrEqual(1);
    expect(typeof sub.monthly_total_micros).toBe('string');
    expect(sub.current_cycle?.id).toMatch(/^cyc_/);

    const preview = await meshio.billing.subscription.preview({ seats: 3 });
    expect(preview.seats).toBe(3);
    expect(typeof preview.unit_price_micros).toBe('string');
    expect(BigInt(preview.monthly_total_micros)).toBe(BigInt(preview.unit_price_micros) * 3n);
    expect(microsToReais(preview.monthly_total_micros, 2)).toMatch(/^\d+\.\d{2}$/);

    const seats = await meshio.billing.subscription.seats.preview({ add: 1 });
    expect(seats).toBeTypeOf('object');
  });

  it('franquia, ciclos e consumos', async () => {
    const allowance = await meshio.billing.allowance.get();
    expect(allowance.cycle_id).toMatch(/^cyc_/);
    expect(allowance.remaining_messages).toBe(
      Math.max(0, allowance.included_messages - allowance.used_messages - allowance.held_messages),
    );
    const cycles = await meshio.billing.cycles.list({ limit: 5 });
    expect(cycles.data.map((c) => c.id)).toContain(allowance.cycle_id);
    const consumptions = await meshio.billing.allowance.consumptions.list({
      cycle_id: allowance.cycle_id,
      limit: 2,
    });
    expect(Array.isArray(consumptions.data)).toBe(true);
  });

  it('faturas, preços, saldo anterior e extrato', async () => {
    const invoices = await meshio.billing.invoices.list({ limit: 5 });
    const inv = invoices.data[0];
    if (inv) expect((await meshio.billing.invoices.get(inv.id)).id).toBe(inv.id);
    await meshio.billing.pricing();
    const wallet = await meshio.billing.wallet();
    expect(typeof wallet.paid_balance_micros).toBe('string');
    expect(microsToReais(wallet.paid_balance_micros)).toMatch(/^-?\d+(\.\d+)?$/);
    expect(typeof (await meshio.billing.entries.exportCsv())).toBe('string');
  });

  it('rota descontinuada responde 410 DISCONTINUED com GoneError', async () => {
    const err = await meshio.http
      .request({ method: 'GET', path: '/v1/billing/trial' })
      .catch((e) => e);
    expect(err).toBeInstanceOf(GoneError);
    expect(err.code).toBe('DISCONTINUED');
    expect(err.replacement).toBe('/v1/billing/subscription');
    expect(err.messagePt).toBeTruthy();
    const post = await meshio.http
      .request({ method: 'POST', path: '/v1/billing/topups', body: { amount_micros: '1000000' } })
      .catch((e) => e);
    expect(post).toBeInstanceOf(GoneError);
  });

  it('webhook endpoints: ciclo completo com URL única', async () => {
    const url = `https://example.com/meshio-node-${randomUUID()}`;
    const created = await meshio.webhookEndpoints.create({
      url,
      event_types: ['webhook.test'],
      description: 'sdk node integração',
    });
    try {
      expect(created.url).toBe(url);
      expect(created.secret).toMatch(/^whsec_/);
      expect((await meshio.webhookEndpoints.get(created.id)).id).toBe(created.id);
      const updated = await meshio.webhookEndpoints.update(created.id, {
        description: 'atualizado',
      });
      expect(updated.description).toBe('atualizado');
      await meshio.webhookEndpoints.test(created.id);
      const rotated = await meshio.webhookEndpoints.rotateSecret(created.id);
      expect(rotated.secret).toMatch(/^whsec_/);
      const deliveries = await meshio.webhookDeliveries.list({ endpoint_id: created.id, limit: 5 });
      const d = deliveries.data[0];
      if (d) expect((await meshio.webhookDeliveries.get(d.id)).id).toBe(d.id);
    } finally {
      await meshio.webhookEndpoints.delete(created.id);
    }
    await expect(meshio.webhookEndpoints.get(created.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('link de conexão: criar, obter e revogar', async () => {
    const biz = (await meshio.businesses.list({ limit: 1 })).data[0];
    if (!biz) return;
    const link = await meshio.connectLinks.create({ business_id: biz.id });
    expect((await meshio.connectLinks.get(link.id)).id).toBe(link.id);
    const revoked = await meshio.connectLinks.revoke(link.id);
    expect(revoked.status).toBe('revoked');
  });

  it('opt-out: criar e remover', async () => {
    const biz = (await meshio.businesses.list({ limit: 1 })).data[0];
    if (!biz) return;
    const phone = `+55119${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
    await meshio.optOuts.create({ business_id: biz.id, phone });
    await meshio.optOuts.delete({ business_id: biz.id, phone });
  });
});

const simUrl = process.env.MESHIO_TEST_SIM_URL?.replace(/\/$/, '');

describe.skipIf(!run || !simUrl)('integração com o Simulador (MESHIO_TEST_SIM_URL)', () => {
  const meshio = new Meshio({ apiKey, baseUrl, maxRetries: 1 });
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const rand = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));

  async function postSim(path: string, body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(`${simUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.ok).toBe(true);
    return (await res.json()) as Record<string, unknown>;
  }

  it('conecta número, recebe mensagem, envia com idempotência e desconecta', async () => {
    // Envio exige cliente verificado (CNPJ e atividade): usa um já verificado.
    const verified = (await meshio.compliance.status()).businesses.find(
      (b) => b.verification_status === 'verified' && !b.suspended,
    );
    expect(verified).toBeDefined();
    const biz = { id: verified!.business_id };

    // Sem vaga livre, conectar responde 409 NUMBER_LIMIT_REACHED (vaga não é número).
    const sub = await meshio.billing.subscription.get();
    const limit = sub.number_limit?.limit;
    if (typeof limit === 'number' && sub.connected_numbers >= limit) {
      const err = await meshio.channels.signupSessions
        .create({ business_id: biz!.id, mode: 'cloud_api' } as never)
        .catch((e) => e);
      expect(err).toBeInstanceOf(ConflictError);
      expect(err.code).toBe('NUMBER_LIMIT_REACHED');
      expect(['seats', 'trial', 'no_active_plan']).toContain(err.reason);
      expect(err.messagePt).toBeTruthy();
      return;
    }

    const session = await meshio.channels.signupSessions.create({
      business_id: biz!.id,
      mode: 'cloud_api',
    } as never);
    expect((await meshio.channels.signupSessions.get(session.signup_session_id)).id).toBe(
      session.signup_session_id,
    );

    // O Simulador faz o papel da janela de cadastro da Meta.
    const q = new URL(session.launch.url as string).searchParams;
    const phone = `+55 11 9${rand(1000, 9999)}-${rand(1000, 9999)}`;
    const sim = await postSim('/es/dialog/submit', {
      app_id: q.get('app_id'),
      config_id: q.get('config_id'),
      state: q.get('state'),
      feature_type: null,
      origin: q.get('origin'),
      scenario: 'success',
      business_name: 'SDK node',
      display_phone_number: phone,
      verified_name: 'SDK node',
    });
    const assets = sim.assets as Record<string, string>;

    let channel = await meshio.channels.signupSessions.complete(session.signup_session_id, {
      state: session.state,
      code: assets.code!,
      waba_id: assets.waba_id!,
      phone_number_id: assets.phone_number_id!,
      event: 'FINISH',
    } as never);
    try {
      expect(channel.business_id).toBe(biz!.id);
      await meshio.channels.healthCheck(channel.id);
      // A ativação é assíncrona (validação na Meta); aguarda até 20 s.
      for (let i = 0; i < 40 && channel.status !== 'active'; i++) {
        await wait(500);
        channel = await meshio.channels.get(channel.id);
      }
      expect(channel.status).toBe('active');

      // Mensagem do cliente abre a janela de 24 h para texto livre.
      const contact = `+55119${rand(10000000, 99999999)}`;
      await postSim('/_sim/inbound-message', {
        phone_number_id: assets.phone_number_id,
        from: contact.slice(1),
        text: 'Oi',
      });
      for (let i = 0; i < 40; i++) {
        if ((await meshio.conversations.timeline(channel.id, contact, { limit: 1 })).data.length) {
          break;
        }
        await wait(500);
      }

      const body = {
        channel_id: channel.id,
        to: contact,
        type: 'text' as const,
        text: { body: 'Teste do SDK Node' },
        client_reference: 'sdk-node',
      };
      const idempotencyKey = `sdk-node-${randomUUID()}`;
      const first = await meshio.messages.send(body, { idempotencyKey });
      expect(first.status).toBe('queued');
      const second = await meshio.messages.send(body, { idempotencyKey });
      expect(second.id).toBe(first.id);
      expect(second.idempotent_replay).toBe(true);
      const conflict = await meshio.messages
        .send({ ...body, client_reference: 'other' }, { idempotencyKey })
        .catch((e) => e);
      expect(conflict).toBeInstanceOf(ConflictError);
      expect(conflict.code).toBe('IDEMPOTENCY_CONFLICT');
      expect((await meshio.messages.get(first.id)).id).toBe(first.id);
    } finally {
      await meshio.channels.disconnect(channel.id, { confirm: true } as never);
    }
  }, 90_000);
});
