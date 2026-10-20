import { Meshio } from '../src/index.js';

export interface Recorded {
  url: URL;
  method: string;
  headers: Headers;
  body: unknown;
}

type Reply = Response | (() => Response) | Error;

/** fetch simulado: devolve as respostas na ordem e registra as requisições. */
export function mockFetch(...replies: Reply[]) {
  const calls: Recorded[] = [];
  const fn = async (input: string, init: RequestInit): Promise<Response> => {
    calls.push({
      url: new URL(input),
      method: init.method ?? 'GET',
      headers: new Headers(init.headers),
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    const next = replies.length > 1 ? replies.shift()! : replies[0];
    if (!next) throw new Error('sem resposta simulada');
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next() : next.clone();
  };
  return { fn, calls };
}

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

export const apiError = (status: number, code: string, message: string, details = {}) =>
  json(status, { error: { code, message, details }, request_id: 'req_body' });

export function client(fetch: ReturnType<typeof mockFetch>['fn'], extra = {}) {
  const m = new Meshio({ apiKey: 'msk_test_x', baseUrl: 'https://api.test', fetch, ...extra });
  m.http.sleep = async () => undefined;
  return m;
}
