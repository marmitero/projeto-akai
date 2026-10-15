# ADR-001 — Separar cliente, servidor e domínio local

Data: 15/10/2026. Estado: aceito como diretriz do Master Prompt; bibliotecas/versões específicas continuam pendentes. Não implementado.

## Contexto

Desenvolvimento começa no navegador, precisa de teste local rápido e evolui para economia competitiva online. Uma aplicação que controla saldo apenas no browser não satisfaz o produto.

## Decisão

Manter apps/client e apps/server com builds independentes; packages/shared contém contratos puros, nunca secrets ou persistência privilegiada. TypeScript estrito em ambos. Phaser 3/Vite no cliente; Node/PostgreSQL no servidor. Domínio local implementa interface de comandos/estado para fixtures, explicitamente separado da autoridade online. Infra de auth/Supabase e Fastify são propostas a verificar em F1/F5.

## Alternativas e consequências

Só cliente seria simples para protótipo, mas inseguro para economia. Backend diretamente no componente UI acoplaria SDKs a gameplay e dificultaria teste/Android. Separação adiciona contratos e adaptadores, permite testes determinísticos e evita import de saldo local para online. Offline local não valida segurança online. Ver ARCHITECTURE, API e SECURITY para detalhamento.
