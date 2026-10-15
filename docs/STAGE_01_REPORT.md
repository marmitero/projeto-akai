# Relatório da etapa 1 — fundação técnica

Data: 15/10/2026. Base: `21aec0322088c910d5935c8b991e2b6103178f0d`. **Etapa concluída no escopo de fundação; não é MVP jogável.**

## O que foi feito

Monorepo npm com cliente TypeScript/Phaser/Vite, servidor Fastify e pacote de contratos Zod independentes. Lockfile, runtime/configuração, scripts de desenvolvimento/build/typecheck/teste e workflow de CI. Cliente interno local com saldos zerados, seleção de destinos e sessão fora da cena. Persistência IndexedDB versionada com cópia anterior, hash de integridade, recuperação explícita/quarentena e proteção contra escrita concorrente. Servidor com health real, bind local, log estruturado, limite de corpo e erros previsíveis; gameplay online recusado explicitamente.

Schema1 é o primeiro save real. Nenhuma migração de um schema antigo inexistente foi fabricada. Versões/configurações desconhecidas bloqueiam gravação; futuras migrações exigem formato concreto e fixtures.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| `npm ci` | Instalação limpa a partir do lockfile concluída |
| `npm run typecheck` | Passou em shared, cliente, servidor, testes e configurações |
| `npm test` | 14 testes, 4 arquivos, todos passaram |
| `npm run build` | Shared, cliente e servidor compilados com sucesso |
| HTTP em processos reais | Cliente 200; GET /health 200 com onlineGameplay=false; POST de gameplay 503 |
| `npm run test:browser` | Chromium headless153.0.8010.0: canvas Phaser, 50 ciclos de navegação, save/reload preservando destino, larguras320/360/390/768 sem overflow horizontal e modo online bloqueado; zero pageerrors |
| `npm audit` e `npm audit --omit=dev` | Zero vulnerabilidades conhecidas reportadas na execução; não equivale a auditoria completa |
| Arte e escopo | Nenhum sprite original/manifesto de assets alterado; sem gameplay/pagamento/infra externa |
| Documentação | AI_STATE, roadmap, arquitetura, API, dados, decisões, testes, README e governança atualizados |

Teste de navegador usou executável temporário obtido via pacote Chromium de teste fora do repositório, pois o download padrão Playwright retornou arquivo truncado e o ambiente limita dependências de sistema/GPU. Execução final por software com AKAI_BROWSER_EXECUTABLE e libs temporárias. O script versionado usa Playwright padrão em ambiente comum; não exige essa adaptação local do runtime do desenvolvedor. Não houve benchmark Android/WebGL.

## Decisões autônomas

npm workspaces sem orquestrador adicional; Fastify para a fundação HTTP; Zod nos contratos; IndexedDB direto com fake-indexeddb de teste; Playwright somente no tooling de desenvolvimento; Node24/TS5.9 e versões registradas em ADR-005/lockfile. Online falha fechado, sem simular autenticação/saldo confiável. Não foi necessário envolver o usuário ou contratar nada.

## Faltas e limitações

- F2: interface final, HUD/menus e sprites ainda não integrados. A cena interna de fundação não substitui arte do jogo.
- F3: combate, ondas, boss, clique, upgrades, carvão, cálculo offline e expansão do save ainda pendentes.
- F5+: auth, PostgreSQL, ledger/outbox e regras online são especificações futuras, não funcionalidades prontas.
- O build avisa sobre chunk Phaser ~1.208KB (~332KB gzip), além de anotações PURE removidas em comentários da dependência Zod. Build passa; profiling/otimização mobile seguem F2. Total inicial sem acervo fica abaixo do orçamento proposto de5MB transferidos.
- Workflow CI versionado; nenhum resultado remoto foi presumido nesta entrega.
- Inventário técnico anterior preservado; licenças dos assets e recortes/pivôs completos ainda pendentes.

## Validação necessária do usuário

Nenhuma para concluir esta etapa ou seguir com integração visual local. Licenças, eventuais custos/contas e decisões comerciais continuam nos gates futuros; não tratar licença pendente como liberação de distribuição.

## Próximo passo recomendado

F2: selecionar subset de assets, medir recortes/pivôs, integrar herói/inimigos/fundo/mina e HUD final nas três telas. Preservar sessão, save e isolamento de input já estabelecidos. Validar composição/legibilidade no navegador antes de implementar o loop econômico F3.
