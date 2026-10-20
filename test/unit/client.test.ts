import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  BadRequestError,
  ConflictError,
  ConnectionError,
  Meshio,
  MeshioError,
  NotFoundError,
  PermissionDeniedError,
  PolicyBlockedError,
  RateLimitError,
  ServerError,
  TimeoutError,
  VERSION,
  ValidationError,
} from '../../src/index.js';
import { apiError, client, json, mockFetch } from '../helpers.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sendBody = {
  channel_id: 'chn_1',
  to: '+5511988887777',
  type: 'text' as const,
  text: { body: 'Oi' },
};

afterEach(() => vi.unstubAllEnvs());

describe('configuração', () => {
  it('envia cabeçalhos padrão', async () => {
    const f = mockFetch(json(200, { api: 'v1' }));
    await client(f.fn).version.get();
    const h = f.calls[0]!.headers;
    expect(h.get('authorization')).toBe('Bearer msk_test_x');
    expect(h.get('user-agent')).toBe(`meshio-node/${VERSION}`);
    expect(h.get('accept')).toBe('application/json');
    expect(f.calls[0]!.url.toString()).toBe('https://api.test/v1/version');
  });

  it('lê MESHIO_API_KEY e MESHIO_BASE_URL', async () => {
    vi.stubEnv('MESHIO_API_KEY', 'msk_test_env');
    vi.stubEnv('MESHIO_BASE_URL', 'http://local:1/');
    const f = mockFetch(json(200, {}));
    const m = new Meshio({ fetch: f.fn });
    expect(m.http.baseUrl).toBe('http://local:1');
    await m.version.get();
    expect(f.calls[0]!.headers.get('authorization')).toBe('Bearer msk_test_env');
  });

  it('usa padrões da especificação', () => {
    const m = new Meshio({ apiKey: 'msk_live_x' });
    expect(m.http.baseUrl).toBe('https://api.meshio.com.br');
    expect(m.http.timeout).toBe(30_000);
    expect(m.http.maxRetries).toBe(2);
  });

  it('exige chave', () => {
    vi.stubEnv('MESHIO_API_KEY', '');
    expect(() => new Meshio()).toThrow(/MESHIO_API_KEY/);
  });

  it('serializa query omitindo nulos e codifica caminho', async () => {
    const f = mockFetch(json(200, { data: [], next_cursor: null }));
    await client(f.fn).conversations.timeline('chn_1', '+5511988887777', {
      limit: 5,
      cursor: null,
    });
    expect(f.calls[0]!.url.pathname).toBe('/v1/conversations/chn_1/%2B5511988887777');
    expect(f.calls[0]!.url.search).toBe('?limit=5');
  });
});

describe('mapeamento de erros', () => {
  const cases: Array<[number, string, new (...a: never[]) => MeshioError]> = [
    [400, 'IDEMPOTENCY_KEY_REQUIRED', BadRequestError],
    [401, 'UNAUTHENTICATED', AuthenticationError],
    [403, 'FORBIDDEN', PermissionDeniedError],
    [404, 'NOT_FOUND', NotFoundError],
    [409, 'IDEMPOTENCY_CONFLICT', ConflictError],
    [402, 'INSUFFICIENT_BALANCE', MeshioError],
    [500, 'INTERNAL', ServerError],
  ];
  for (const [status, code, Cls] of cases) {
    it(`${status} ${code} → ${Cls.name}`, async () => {
      const f = mockFetch(apiError(status, code, 'mensagem em pt-BR'));
      const err = await client(f.fn, { maxRetries: 0 })
        .businesses.get('biz_1')
        .catch((e) => e);
      expect(err).toBeInstanceOf(Cls);
      expect(err).toBeInstanceOf(MeshioError);
      expect(err).toMatchObject({
        status,
        code,
        message: 'mensagem em pt-BR',
        requestId: 'req_body',
      });
    });
  }

  it('422 expõe fields; X-Request-Id tem prioridade', async () => {
    const res = json(
      422,
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'inválido',
          details: { fields: { to: 'obrigatório' } },
        },
      },
      { 'x-request-id': 'req_hdr' },
    );
    const err = await client(mockFetch(res).fn)
      .businesses.list()
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.fields).toEqual({ to: 'obrigatório' });
    expect(err.requestId).toBe('req_hdr');
  });

  it('POLICY_BLOCKED → PolicyBlockedError preservando status', async () => {
    const f = mockFetch(apiError(422, 'POLICY_BLOCKED', 'bloqueado', { reason: 'opt_out' }));
    const err = await client(f.fn)
      .messages.send(sendBody)
      .catch((e) => e);
    expect(err).toBeInstanceOf(PolicyBlockedError);
    expect(err.status).toBe(422);
    expect(err.details).toEqual({ reason: 'opt_out' });
  });

  it('429 expõe retryAfter quando não há mais tentativas', async () => {
    const r = () =>
      json(429, { error: { code: 'RATE_LIMITED', message: 'devagar' } }, { 'retry-after': '7' });
    const err = await client(mockFetch(r).fn, { maxRetries: 0 })
      .businesses.list()
      .catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(7);
  });

  it('corpo não JSON vira mensagem genérica', async () => {
    const f = mockFetch(new Response('gateway', { status: 502 }));
    const err = await client(f.fn, { maxRetries: 0 })
      .businesses.list()
      .catch((e) => e);
    expect(err).toBeInstanceOf(ServerError);
    expect(err.message).toBe('gateway');
  });
});

describe('novas tentativas', () => {
  it('GET repete em 503 e respeita Retry-After', async () => {
    const f = mockFetch(json(503, {}, { 'retry-after': '3' }), json(200, { ok: true }));
    const m = client(f.fn);
    const waits: number[] = [];
    m.http.sleep = async (ms) => {
      waits.push(ms);
    };
    await expect(m.businesses.list()).resolves.toEqual({ ok: true });
    expect(f.calls).toHaveLength(2);
    expect(waits).toEqual([3000]);
  });

  it('backoff exponencial limitado quando não há Retry-After', async () => {
    const f = mockFetch(json(500, {}), json(502, {}), json(504, {}), json(200, {}));
    const m = client(f.fn, { maxRetries: 3 });
    const waits: number[] = [];
    m.http.sleep = async (ms) => {
      waits.push(ms);
    };
    await m.channels.list();
    expect(waits).toHaveLength(3);
    expect(waits[0]).toBeGreaterThanOrEqual(250);
    expect(waits[0]).toBeLessThanOrEqual(500);
    expect(waits[2]).toBeLessThanOrEqual(2000);
  });

  it('desiste após maxRetries', async () => {
    const f = mockFetch(json(500, {}));
    await expect(client(f.fn).businesses.list()).rejects.toBeInstanceOf(ServerError);
    expect(f.calls).toHaveLength(3);
  });

  it('não repete outros 4xx', async () => {
    const f = mockFetch(apiError(404, 'NOT_FOUND', 'x'));
    await expect(client(f.fn).businesses.get('b')).rejects.toBeInstanceOf(NotFoundError);
    expect(f.calls).toHaveLength(1);
  });

  it('POST sem idempotência não é repetido em 5xx nem em erro de rede', async () => {
    const f = mockFetch(json(503, {}));
    await expect(client(f.fn).webhookEndpoints.test('we_1')).rejects.toBeInstanceOf(ServerError);
    const g = mockFetch(new TypeError('fetch failed'));
    await expect(client(g.fn).templates.submit('t')).rejects.toBeInstanceOf(ConnectionError);
    expect(f.calls).toHaveLength(1);
    expect(g.calls).toHaveLength(1);
  });

  it('GET repete em erro de rede', async () => {
    const f = mockFetch(new TypeError('fetch failed'), json(200, { ok: 1 }));
    await expect(client(f.fn).billing.wallet()).resolves.toEqual({ ok: 1 });
  });

  it('timeout vira TimeoutError', async () => {
    const hang = (_: string, init: RequestInit) =>
      new Promise<Response>((_r, reject) =>
        init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      );
    const m = new Meshio({ apiKey: 'k', fetch: hang, timeout: 20, maxRetries: 0 });
    const err = await m.version.get().catch((e) => e);
    expect(err).toBeInstanceOf(TimeoutError);
    expect(err).toBeInstanceOf(ConnectionError);
  });
});

describe('idempotência', () => {
  it('messages.send gera UUID v4 e reutiliza nas tentativas', async () => {
    const f = mockFetch(json(503, {}), json(202, { id: 'msg_1', status: 'queued' }));
    const res = await client(f.fn).messages.send(sendBody);
    const keys = f.calls.map((c) => c.headers.get('idempotency-key'));
    expect(keys[0]).toMatch(UUID_V4);
    expect(keys[1]).toBe(keys[0]);
    expect(f.calls[0]!.body).toEqual(sendBody);
    expect(f.calls[0]!.headers.get('content-type')).toBe('application/json');
    expect(res.idempotent_replay).toBe(false);
  });

  it('usa a chave informada e expõe Idempotent-Replayed', async () => {
    const f = mockFetch(json(202, { id: 'msg_1' }, { 'Idempotent-Replayed': 'true' }));
    const res = await client(f.fn).messages.send(sendBody, { idempotencyKey: 'pedido-42' });
    expect(f.calls[0]!.headers.get('idempotency-key')).toBe('pedido-42');
    expect(res.idempotent_replay).toBe(true);
  });

  it('topups.create: chave opcional; sem chave não repete', async () => {
    const f = mockFetch(json(500, {}));
    await expect(
      client(f.fn).billing.topups.create({ amount_cents: 1000 } as never),
    ).rejects.toBeInstanceOf(ServerError);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.headers.has('idempotency-key')).toBe(false);

    const g = mockFetch(json(500, {}), json(201, { id: 'top_1' }));
    const res = await client(g.fn).billing.topups.create({ amount_cents: 1000 } as never, {
      idempotencyKey: 'k1',
    });
    expect(g.calls.map((c) => c.headers.get('idempotency-key'))).toEqual(['k1', 'k1']);
    expect(res.id).toBe('top_1');
  });
});

describe('paginação', () => {
  it('listAll segue next_cursor preservando filtros', async () => {
    const f = mockFetch(
      json(200, { data: [{ id: 1 }, { id: 2 }], next_cursor: 'c2' }),
      json(200, { data: [{ id: 3 }], next_cursor: null }),
    );
    const ids: unknown[] = [];
    for await (const b of client(f.fn).businesses.listAll({
      status: 'active',
      limit: 2,
    } as never)) {
      ids.push((b as unknown as { id: number }).id);
    }
    expect(ids).toEqual([1, 2, 3]);
    expect(f.calls[0]!.url.searchParams.get('cursor')).toBeNull();
    expect(f.calls[1]!.url.searchParams.get('cursor')).toBe('c2');
    expect(f.calls[1]!.url.searchParams.get('status')).toBe('active');
    expect(f.calls[1]!.url.searchParams.get('limit')).toBe('2');
  });

  it('list devolve a página', async () => {
    const f = mockFetch(json(200, { data: [], next_cursor: 'x' }));
    await expect(client(f.fn).events.list({ limit: 1 })).resolves.toEqual({
      data: [],
      next_cursor: 'x',
    });
  });
});

describe('CSV e 204', () => {
  it('exportCsv devolve texto', async () => {
    const f = mockFetch(
      new Response('a,b\n1,2\n', { status: 200, headers: { 'content-type': 'text/csv' } }),
    );
    await expect(client(f.fn).usage.exportCsv({})).resolves.toBe('a,b\n1,2\n');
    expect(f.calls[0]!.headers.get('accept')).toContain('text/csv');
  });
  it('DELETE 204 devolve undefined', async () => {
    const f = mockFetch(new Response(null, { status: 204 }));
    await expect(client(f.fn).webhookEndpoints.delete('we_1')).resolves.toBeUndefined();
  });
});
