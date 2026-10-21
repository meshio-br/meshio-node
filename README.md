# Meshio para Node.js

SDK oficial da [API Meshio](https://app.meshio.com.br/docs) para TypeScript e JavaScript (Node.js 18+). Sem dependências de runtime, com tipos gerados do contrato OpenAPI, ESM e CommonJS.

## Instalação

```bash
npm install github:meshio-br/meshio-node#v0.1.0
```

O SDK é instalado direto do GitHub, fixando a tag da versão (não há pacote em registro). Na instalação, o npm compila o pacote pelo script `prepare`. O import continua `@meshio/sdk`.

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

Toda listagem tem `list` (uma página) e `listAll` (iterador assíncrono). Ex.: `messages`, `channels`, `templates`, `events`, `webhookDeliveries`, `billing.invoices`, `billing.cycles`, `billing.allowance.consumptions`, `billing.entries`.

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

Respostas de erro viram exceções tipadas, todas subclasses de `MeshioError` com `status`, `code`, `message`, `messagePt`, `reason`, `details` e `requestId`. A `message` vem da API e é informativa (pode estar em inglês); a explicação em português fica em `messagePt` (de `details.message_pt`) e, em erros de validação, em `fields` (de `details.fields`, sempre presente):

| Status/código     | Classe                  |
| ----------------- | ----------------------- |
| 400               | `BadRequestError`       |
| 401               | `AuthenticationError`   |
| 402               | `PaymentRequiredError` (envio bloqueado pela cobrança) |
| 403               | `PermissionDeniedError` |
| 404               | `NotFoundError`         |
| 409               | `ConflictError` (inclui `IDEMPOTENCY_CONFLICT`, `NUMBER_LIMIT_REACHED`, `OVERAGE_UNAVAILABLE`) |
| 410               | `GoneError` (`DISCONTINUED`, com `replacement`) |
| 422               | `ValidationError` (`fields`: campo → mensagem; inclui `PAYMENT_METHOD_UNAVAILABLE`) |
| 429               | `RateLimitError` (`retryAfter`) |
| 5xx               | `ServerError` (inclui 503 `BILLING_NOT_CONFIGURED`) |
| `POLICY_BLOCKED`  | `PolicyBlockedError` (mantém o status) |
| rede / tempo      | `ConnectionError` / `TimeoutError` |

```ts
import { MeshioError, PolicyBlockedError, ValidationError } from '@meshio/sdk';

try {
  await meshio.messages.send({ /* … */ });
} catch (err) {
  if (err instanceof PolicyBlockedError) console.log('bloqueado:', err.details.reason);
  else if (err instanceof ValidationError) console.log(err.fields);
  else if (err instanceof MeshioError) console.log(err.status, err.code, err.messagePt ?? err.message, err.requestId);
  else throw err;
}
```

O SDK faz até `maxRetries` novas tentativas (padrão 2), esperando o `Retry-After` quando houver ou 0,5 s, 1 s, 2 s… (máx. 8 s, com variação aleatória):

- 429 e falha de conexão antes de a requisição sair (ex.: conexão recusada, DNS): sempre repetidos;
- 500, 502, 503, 504 e tempo esgotado: repetidos só em `GET` ou quando há `Idempotency-Key` (`messages.send`, `billing.subscription.create`, `billing.subscription.seats.change` e `billing.invoices.pay` sempre levam uma, gerada pelo SDK se você não informar);
- 503 `BILLING_NOT_CONFIGURED`: nunca repetido (não é transitório; a cobrança precisa ser configurada antes);
- outros 4xx: nunca repetidos.

Por chamada: `{ timeout, maxRetries, signal, idempotencyKey, headers }` no último argumento.

## Assinatura e franquia

A Meshio cobra uma assinatura mensal por vaga (número contratado); cada vaga traz mensagens que somam uma franquia compartilhada por todos os seus números no ciclo. As tarifas da Meta continuam separadas.

```ts
import { PaymentRequiredError, microsToReais } from '@meshio/sdk';

const sub = await meshio.billing.subscription.get();
console.log(sub.status, sub.seats, sub.connected_numbers);   // 'active', 3, 2
console.log(sub.current_cycle?.period_end);                   // fim do ciclo (renovação)
if (sub.monthly_total_micros) console.log(microsToReais(sub.monthly_total_micros, 2)); // "179.70"

const allowance = await meshio.billing.allowance.get();
console.log(`${allowance.remaining_messages} de ${allowance.included_messages} mensagens restantes (${allowance.percent}% usado)`);

// Quanto custaria ter 5 vagas (sem alterar nada)
const preview = await meshio.billing.subscription.seats.preview({ target: 5 });

try {
  await meshio.messages.send({ /* … */ });
} catch (err) {
  if (err instanceof PaymentRequiredError && err.code === 'ALLOWANCE_EXHAUSTED') {
    // Franquia do ciclo esgotada: espere a renovação (details.cycle_ends_at) ou acrescente vagas.
    // Nada foi criado; repita depois com a mesma Idempotency-Key.
    console.log(err.reason, err.messagePt, err.details.cycle_ends_at);
  } else throw err;
}
```

Outros bloqueios de envio também chegam como `PaymentRequiredError` (402): `SUBSCRIPTION_REQUIRED` (`reason`: `trial_ended`, `no_plan`, `subscription_canceled`, `subscription_incomplete`) e `SUBSCRIPTION_PAST_DUE`. Conectar número sem vaga livre dá `ConflictError` com `code === 'NUMBER_LIMIT_REACHED'`. Recebimentos e webhooks nunca são bloqueados.

`billing.subscription.create`, `billing.subscription.seats.change` e `billing.invoices.pay` levam `Idempotency-Key` automaticamente (repetir com a mesma chave não cobra de novo). Rotas do modelo antigo de saldo pré-pago respondem `GoneError` (`410 DISCONTINUED`); o saldo anterior continua consultável em `billing.wallet()`.

## Dinheiro em micros

Valores monetários chegam como string em micros (R$ 1 = `"1000000"`). Não converta para `number`; use os helpers exatos:

```ts
import { microsToReais } from '@meshio/sdk';

const { unit_price_micros } = await meshio.billing.subscription.preview({ seats: 3 });
microsToReais(unit_price_micros);    // "59.9"
microsToReais(unit_price_micros, 2); // "59.90"
```

## Recursos

`version`, `businesses`, `channels` (`signupSessions`, `metaLogs`), `connectLinks`, `messages`, `conversations`, `templates`, `webhookEndpoints`, `webhookDeliveries`, `events`, `usage` (`get`, `exportCsv`, `overview`, `integrationStatus`), `compliance`, `consents`, `optOuts`, `billing` (`subscription` com `get`, `preview`, `create`, `seats.preview`, `seats.change`, `cancel`, `resume`, `updateOverage`, `updatePaymentMethod`; `allowance` com `get` e `consumptions`; `cycles`; `invoices` com `list`, `get`, `pay`; `pricing`; `wallet`; `entries` com `exportCsv`; `topups`, só histórico). Cobre as 73 operações do contrato; exportações CSV devolvem o texto. Os tipos de cada modelo estão em `Schemas` (ex.: `Schemas['SendMessageIn']`).

## Versões suportadas

Node.js 18, 20 e 22. Segue [SemVer](https://semver.org/lang/pt-BR/); enquanto estiver em `0.x`, versões menores podem trazer mudanças incompatíveis, registradas no [CHANGELOG](CHANGELOG.md).

## Desenvolvimento

```bash
npm ci
npm run lint && npm run typecheck && npm test
npm run generate   # regenera os tipos a partir de openapi/
MESHIO_TEST_API_URL=http://localhost:49800 MESHIO_TEST_SIM_URL=http://localhost:49890 MESHIO_TEST_API_KEY=msk_test_… npm run test:integration
```

Documentação completa da API: https://app.meshio.com.br/docs

## Licença

MIT
