# Changelog

Todas as mudanças relevantes deste pacote. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Alterado

- Regra única de novas tentativas: 429 e falha de conexão antes do envio sempre; 5xx e tempo esgotado só em `GET` ou com `Idempotency-Key`, exceto 503 `BILLING_NOT_CONFIGURED`, que não é transitório e nunca é repetido; `PUT` deixa de ser tratado como repetível.

### Adicionado

- `MeshioError.messagePt` com a explicação em português de `details.message_pt`; documentação esclarece que `message` pode vir em inglês.

## [0.1.0] - 2026-10-20

### Adicionado

- Cliente `Meshio` cobrindo as 73 operações da API pública v1, com tipos gerados do contrato OpenAPI.
- Cobrança por assinatura de números em `billing`: `subscription` (situação, prévia, contratação, vagas, cancelamento, retomada, excedente, forma de pagamento), `allowance` (franquia e consumos), `cycles`, `invoices` (listar, obter, pagar), `pricing`, `wallet` (saldo anterior), `entries` (com CSV) e `topups` (só histórico).
- Idempotência automática em `messages.send`, `billing.subscription.create`, `billing.subscription.seats.change` e `billing.invoices.pay` (UUID v4 reaproveitado nas novas tentativas); indicador `idempotent_replay`.
- Novas tentativas com `Retry-After` ou backoff exponencial com variação; erros tipados por status, `PolicyBlockedError`, `PaymentRequiredError` (402: `SUBSCRIPTION_REQUIRED`, `SUBSCRIPTION_PAST_DUE`, `ALLOWANCE_EXHAUSTED`) e `GoneError` (410 `DISCONTINUED`, com `replacement`); `MeshioError.reason` expõe `details.reason`.
- Paginação por cursor com `list` e `listAll` (iterador assíncrono).
- Verificação de assinatura de webhooks (`webhooks.verify` / `constructEvent`) com eventos tipados por `event_type`, incluindo `billing.allowance_*`, `billing.invoice_*`, `billing.overage_limit_reached`, `billing.subscription_updated` e `billing.trial_*`.
- Helpers `microsToReais` e `reaisToMicros`.
- Pacote ESM + CommonJS com declarações de tipo, sem dependências de runtime (Node.js 18+).
