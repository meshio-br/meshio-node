import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  ConflictError,
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
      meshio.billing.numberFees.list({ limit: 2 }),
      meshio.billing.topups.list({ limit: 2 }),
    ]) {
      expect(Array.isArray((await p).data)).toBe(true);
    }
    const ev = (await meshio.events.list({ limit: 1 })).data[0];
    if (ev) expect((await meshio.events.get(ev.id)).id).toBe(ev.id);
  });

  it('uso, conformidade e cobrança', async () => {
    await meshio.usage.get();
    expect(typeof (await meshio.usage.exportCsv())).toBe('string');
    await meshio.usage.overview();
    await meshio.usage.integrationStatus();
    await meshio.compliance.status();
    const wallet = await meshio.billing.wallet();
    expect(typeof wallet.balance_micros).toBe('string');
    expect(microsToReais(wallet.balance_micros)).toMatch(/^-?\d+(\.\d+)?$/);
    await meshio.billing.pricing();
    expect(typeof (await meshio.billing.entries.exportCsv())).toBe('string');
    await meshio.billing.consumption();
    await meshio.billing.numberFees.summary();
    await meshio.billing.trial();
    await meshio.billing.settings.get();
    await meshio.billing.bonusOffers();
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
    const biz = (await meshio.businesses.list({ limit: 1 })).data[0];
    expect(biz).toBeDefined();
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
