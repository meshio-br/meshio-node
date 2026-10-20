# Changelog

Todas as mudanças relevantes deste pacote. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.0] - 2026-10-20

### Adicionado

- Cliente `Meshio` cobrindo as 67 operações da API pública v1, com tipos gerados do contrato OpenAPI.
- Idempotência automática em `messages.send` (UUID v4 reaproveitado nas novas tentativas) e opcional em `billing.topups.create`; indicador `idempotent_replay`.
- Novas tentativas com `Retry-After` ou backoff exponencial com variação; erros tipados por status e `PolicyBlockedError`.
- Paginação por cursor com `list` e `listAll` (iterador assíncrono).
- Verificação de assinatura de webhooks (`webhooks.verify` / `constructEvent`) com eventos tipados por `event_type`.
- Helpers `microsToReais` e `reaisToMicros`.
- Pacote ESM + CommonJS com declarações de tipo, sem dependências de runtime (Node.js 18+).
