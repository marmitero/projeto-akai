# AI_STATE — continuidade do Projeto Akai

Atualizado: 15/10/2026. **F1: FUNDAÇÃO TÉCNICA CONCLUÍDA NO ESCOPO DA ETAPA. Gameplay ainda não implementado.**

## Pedido vigente e governança

O usuário autorizou a próxima etapa após documentação/autonomia: executar F1. A pausa histórica de documentação não bloqueia essa autorização. Ao terminar toda etapa: atualizar AI_STATE, ROADMAP e documentos afetados; listar no chat feito, completude/faltas, decisões, pendências que exijam validação e próximo passo recomendado. Decidir autonomamente escolhas não cruciais financeiramente e sem mudança rigorosa do produto; consultar usuário só nas questões reservadas, já com recomendação concreta.

## Base e estado real

Base remota desta etapa: `21aec0322088c910d5935c8b991e2b6103178f0d`. Agora existem apps/client, apps/server e packages/shared, npm workspaces/lockfile, TypeScript estrito, Phaser/Vite, Fastify, schemas Zod, Vitest e smoke Playwright. Comandos reais em [DEVELOPMENT](docs/DEVELOPMENT.md).

Cliente: perfil local rotulado, saldos zero, seleção de destino independente da sessão, Phaser com cena interna de fundação e persistência IndexedDB. Servidor: diagnóstico /health e erros estruturados; qualquer /api/v1/* responde 503 ONLINE_NOT_AVAILABLE. **Sem auth, banco online, combate, mineração, produção, mercado, anúncios ou compras.** Não apresentar a tela de fundação como interface final do jogo.

## Entregue na F1

- Aplicativos/builds independentes e contratos compartilhados, configurações/env, scripts e workflow CI.
- Sessão local com relógio injetável, snapshots isolados e listeners removíveis; seleção de tela não recria domínio.
- Save schema1/config foundation-1 com hash contra corrupção acidental, cópia anterior, recuperação explícita/quarentena, proteção concorrente por geração/CAS e rejeição de versões/config desconhecidas.
- Nenhum save anterior existia: não inventar migração v0. Compatibilidade futura exige schema real e fixtures. Save local nunca credita online.
- Diagnóstico HTTP, limites de payload, erros sanitizados, log estruturado e bind local padrão.
- Documentação de execução, ADR-005, relatório/testes e atualização dos documentos afetados.

## Validação e limites

Evidências definitivas em [STAGE_01_REPORT](docs/STAGE_01_REPORT.md): instalação limpa, typecheck, testes, builds, smoke HTTP/navegador e auditoria de dependências. Nada disso valida economia/combate ainda inexistentes. CI versionada não significa execução remota confirmada.

Preservados todos os sprites/manifestos anteriores. Inventário técnico original: 7.568 arquivos, 6.872 PNGs, 757 grupos de duplicatas, 47 páginas e 23 prévias. Licenças ainda pendentes; recortes/pivôs completos e aprovação visual de runtime não realizados. F0 continua parcial por essas razões.

## Decisões desta etapa

npm workspaces; Node24/TS5.9; Fastify; Zod; IndexedDB direto + fake-indexeddb; Playwright só de desenvolvimento. Versões exatas no lockfile/ADR-005. Online indisponível por construção, sem backend falso. Shared contém apenas contratos. Evitou-se contratar/provisionar serviços. 20 andares para primeira fatia e cap offline experimental8h continuam adotados para F3, ainda sem implementação ou simulação econômica.

## Pendências e próximo passo

Nenhuma decisão obrigatória do usuário para continuar desenvolvimento local. Pendências técnicas do agente: integração artística F2, pivôs/recortes, HUD final, profiling real e gameplay F3. Chunk Phaser grande e avisos de anotações da dependência estão registrados no relatório, sem bloqueio de build. Licenças, eventual custo/contas/aceites e monetização material seguem gates futuros; não declarar asset liberado sem evidência.

Próximo passo recomendado: F2 (protótipo visual navegável com sprites reais) sobre a sessão e persistência existentes. Não iniciar F3/economia online enquanto a fatia anterior não tiver aceite. Ao encerrar esta tarefa entregar o relatório no chat; nenhuma publicação comercial foi realizada.
