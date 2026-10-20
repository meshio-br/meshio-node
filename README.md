# Meshio para Node.js

SDK oficial da [API Meshio](https://app.meshio.com.br/docs) para TypeScript e JavaScript (Node.js 18+). Sem dependências de runtime, com tipos gerados do contrato OpenAPI, ESM e CommonJS.

## Instalação

```bash
npm install @meshio/sdk
```

## Configuração

```ts
import Meshio from '@meshio/sdk';

const meshio = new Meshio({ apiKey: process.env.MESHIO_API_KEY });
```

| Opção        | Padrão                                         | Descrição                                   |
| ------------ | ---------------------------------------------- | ------------------------------------------- |
| `apiKey`     | `MESHIO_API_KEY`                               | Chave da API (obrigatória)                   |
| `baseUrl`    | `MESHIO_BASE_URL` ou `https://api.meshio.com.br` | Endereço da API                            |
| `timeout`    | `30000`                                        | Tempo limite por tentativa, em ms            |
| `maxRetries` | `2`                                            | Novas tentativas automáticas                 |
| `fetch`      | `globalThis.fetch`                             | Implementação de `fetch` alternativa         |

**Teste x produção:** a chave define o ambiente. `msk_test_…` opera no ambiente de teste (simulador, sem envio real nem dinheiro real); `msk_live_…` opera em produção. O endereço é o mesmo.

Em CommonJS: `const { Meshio } = require('@meshio/sdk');`

## Enviar mensagens

Todo envio leva `Idempotency-Key`. Se você não informar, o SDK gera um UUID v4 e o reaproveita nas novas tentativas. Use uma chave sua (ex.: id do pedido) para evitar envio duplicado mesmo se o seu processo reiniciar.

```ts
// Texto (dentro da janela de atendimento de 24 h)
const msg = await meshio.messages.send(
  {
    channel_id: 'chn_…',
    to: '+5511988887777',
    type: 'text',
    text: { body: 'Seu pedido saiu para entrega.' },
  },
  { idempotencyKey: 'pedido-1234-entrega' },
);
console.log(msg.id, msg.status, msg.idempotent_replay); // replay = true se a chave já tinha sido usada

// Template aprovado
await meshio.messages.send({
  channel_id: 'chn_…',
  to: '+5511988887777',
  type: 'template',
  template: { name: 'pedido_enviado', language: 'pt_BR', variables: { body: ['Ana', '1234'] } },
});
```

## Listar com paginação

```ts
// Uma página: { data, next_cursor }
const page = await meshio.businesses.list({ limit: 50 });

// Todos os itens, buscando as páginas sob demanda
for await (const business of meshio.businesses.listAll({ status: 'active' })) {
  console.log(business.id, business.name);
}
```

Toda listagem tem `list` (uma página) e `listAll` (iterador assíncrono). Ex.: `messages`, `channels`, `templates`, `events`, `webhookDeliveries`, `billing.entries`, `billing.topups`.

## Conectar um número (link de conexão)

```ts
const link = await meshio.connectLinks.create({ business_id: 'biz_…' });
// Envie link.url ao seu cliente; ao concluir, o evento channel.connected chega no seu webhook.
await meshio.connectLinks.revoke(link.id); // se precisar invalidar
```

## Webhooks

Crie o endpoint e guarde o segredo (`whsec_…`), mostrado só nessa resposta e em `rotateSecret`:

```ts
const endpoint = await meshio.webhookEndpoints.create({
  url: 'https://exemplo.com.br/webhooks/meshio',
  event_types: ['message.received', 'message.status_changed', 'channel.connected'],
});
console.log(endpoint.secret);
await meshio.webhookEndpoints.test(endpoint.id); // envia um webhook.test
```

Verifique a assinatura com o corpo **bruto** da requisição:

```ts
import { createServer } from 'node:http';
import Meshio, { WebhookVerificationError, isEventType } from '@meshio/sdk';

const secret = process.env.MESHIO_WEBHOOK_SECRET!;

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  try {
    const event = Meshio.webhooks.verify(Buffer.concat(chunks), req.headers, secret);
    if (isEventType(event, 'message.received')) {
      console.log('mensagem de', event.data.from); // data tipado pelo event_type
    }
    res.writeHead(200).end(); // responda 2xx rápido; deduplique por event.event_id
  } catch (err) {
    res.writeHead(err instanceof WebhookVerificationError ? 400 : 500).end();
  }
}).listen(3000);
```

`verify(rawBody, headers, secret, tolerance = 300)` (também `constructEvent`) confere `Meshio-Signature` (`v1=<hex>`, aceita várias durante a rotação do segredo) com comparação em tempo constante e rejeita timestamps a mais de 5 minutos. `isEventType` estreita o tipo de `event.data`; eventos de tipos novos não quebram (`data` vem como objeto genérico). Com Express, use `express.raw({ type: 'application/json' })` nessa rota.

## Erros e novas tentativas

Respostas de erro viram exceções tipadas, todas subclasses de `MeshioError` com `status`, `code`, `message`, `details` e `requestId`:

| Status/código     | Classe                  |
| ----------------- | ----------------------- |
| 400               | `BadRequestError`       |
| 401               | `AuthenticationError`   |
| 403               | `PermissionDeniedError` |
| 404               | `NotFoundError`         |
| 409               | `ConflictError` (inclui `IDEMPOTENCY_CONFLICT`) |
| 422               | `ValidationError` (`fields`: campo → mensagem) |
| 429               | `RateLimitError` (`retryAfter`) |
| 5xx               | `ServerError`           |
| `POLICY_BLOCKED`  | `PolicyBlockedError` (mantém o status) |
| rede / tempo      | `ConnectionError` / `TimeoutError` |

```ts
import { MeshioError, PolicyBlockedError, ValidationError } from '@meshio/sdk';

try {
  await meshio.messages.send({ /* … */ });
} catch (err) {
  if (err instanceof PolicyBlockedError) console.log('bloqueado:', err.details.reason);
  else if (err instanceof ValidationError) console.log(err.fields);
  else if (err instanceof MeshioError) console.log(err.status, err.code, err.message, err.requestId);
  else throw err;
}
```

O SDK repete automaticamente (até `maxRetries`) em erro de rede, tempo esgotado, 429, 500, 502, 503 e 504, esperando o `Retry-After` quando houver ou 0,5 s, 1 s, 2 s… (máx. 8 s, com variação aleatória). Leituras (`GET`) sempre podem ser repetidas; `POST`/`PATCH`/`DELETE` só quando têm `Idempotency-Key` (`messages.send` e `billing.topups.create` com chave). Outros 4xx nunca são repetidos. Por chamada: `{ timeout, maxRetries, signal, idempotencyKey, headers }` no último argumento.

## Dinheiro em micros

Valores monetários chegam como string em micros (R$ 1 = `"1000000"`). Não converta para `number`; use os helpers exatos:

```ts
import { microsToReais } from '@meshio/sdk';

const wallet = await meshio.billing.wallet();
microsToReais(wallet.available_micros);    // "150"
microsToReais(wallet.available_micros, 2); // "150.00"
```

## Recursos

`version`, `businesses`, `channels` (`signupSessions`, `metaLogs`), `connectLinks`, `messages`, `conversations`, `templates`, `webhookEndpoints`, `webhookDeliveries`, `events`, `usage` (`get`, `exportCsv`, `overview`, `integrationStatus`), `compliance`, `consents`, `optOuts`, `billing` (`wallet`, `pricing`, `entries`, `consumption`, `numberFees`, `trial`, `settings`, `bonusOffers`, `topups`). Cobre as 67 operações do contrato; exportações CSV devolvem o texto. Os tipos de cada modelo estão em `Schemas` (ex.: `Schemas['SendMessageIn']`).

## Versões suportadas

Node.js 18, 20 e 22. Segue [SemVer](https://semver.org/lang/pt-BR/); enquanto estiver em `0.x`, versões menores podem trazer mudanças incompatíveis, registradas no [CHANGELOG](CHANGELOG.md).

## Desenvolvimento

```bash
npm ci
npm run lint && npm run typecheck && npm test
npm run generate   # regenera os tipos a partir de openapi/
MESHIO_TEST_API_URL=http://localhost:49700 MESHIO_TEST_API_KEY=msk_test_… npm run test:integration
```

Documentação completa da API: https://app.meshio.com.br/docs

## Licença

MIT
