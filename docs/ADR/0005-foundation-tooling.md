# ADR-005 — Tooling e baseline executável da F1

Data: 15/10/2026. Estado: adotado pelo agente sob delegação, implementado na fundação.

## Contexto e decisão

Não existia aplicação anterior. Usar npm workspaces com apps/client, apps/server e packages/shared, Node24 e TypeScript estrito. Registro npm consultado para versões/engines; instalação e lockfile verificam a resolução. Versões resolvidas: Phaser3.90.0, Vite7.3.7, TypeScript5.9.3, Fastify5.12.7, Zod4.6.7, Vitest4.1.11, tsx4.23.15, fake-indexeddb6.2.5 e @types/node24.19.2. Playwright foi incluído como tooling de smoke; versão fixada no lockfile. Vitest também resolve Vite8 transitivo no tooling; o cliente continua Vite7.3.7 isolado no workspace. Não se afirma que todas são as últimas majors existentes: Phaser3 preserva o Master Prompt; TS5.9 e Vite7 formam baseline compatível validada com o runtime.

Npm workspaces dispensa gerenciador/orquestrador extra. Zod valida fronteiras; shared exporta DTOs/schemas sem segredo/persistência. Fastify foi adotado para servidor modular. IndexedDB implementado diretamente evita dependência runtime adicional; fake-indexeddb valida transações nos testes. SHA-256 detecta corrupção, geração/CAS evita lost update entre abas. Banco/auth/Supabase permanecem sem provisão para F5.

## Alternativas e consequências

Adicionar monorepo framework/camada de estado antes de haver demanda aumentaria superfície sem benefício provado. localStorage não oferece transação de snapshot/backup. Criar endpoints falsos online confundiria estado real: a API recusa gameplay explicitamente. A fundação não implementa fórmulas econômicas, e o relógio da sessão não concede renda.

## Evidência e limitações

npm ci, typecheck, 14 testes e builds executados. npm audit e npm audit --omit=dev retornaram zero vulnerabilidades conhecidas na execução; isso não é auditoria completa. Dependências diretas têm licenças declaradas MIT/Apache-2.0 conforme metadados instalados; revisar obrigações/transitivas antes da distribuição. Chunk Phaser ~1,21MB (332KB gzip) gera aviso de bundle; anotações PURE de dependência Zod geram avisos não fatais. Não suprimir como se fossem falhas corrigidas; medir no dispositivo em F2. Resultado visual/limitações de ambiente registrados em STAGE_01_REPORT.
