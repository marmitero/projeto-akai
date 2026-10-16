# Documentação do Projeto Akai

Baseline de planejamento — 15/10/2026. **F1–F4 locais; F5 online e F6 comunidade publicadas; F7 mercado publicada com CI aprovada; F8 técnica de teste publicada, monetização externa adiada até a fase final, sem deploy público.** Leia [AI_STATE](../AI_STATE.md) antes de trabalhar. O usuário autorizou publicar F8 e priorizou polimentos em16/10/2026. Pendências em [MONETIZATION_DEFERRED](MONETIZATION_DEFERRED.md), trabalho atual em [POLISH_PLAN](POLISH_PLAN.md). Comandos reais em [DEVELOPMENT](DEVELOPMENT.md); evidências atuais em [STAGE_08_REPORT](STAGE_08_REPORT.md) e regras em [MONETIZATION_SYSTEMS](MONETIZATION_SYSTEMS.md).

## Ordem de leitura

1. [Constituição](00-CONSTITUICAO.md): visão, invariantes, autoridade documental e pausa atual.
2. [Master Prompt](master-prompt.md): intenção completa do produto.
3. [Auditoria de estado](REPOSITORY_AUDIT.md): o que realmente existe.
4. [GDD](GDD.md), [Roadmap](ROADMAP.md) e [aceite do MVP](MVP_ACCEPTANCE.md): comportamento, fases e evidência.
5. [Decisões](DECISIONS.md), [riscos](RISKS.md) e [rastreabilidade](REQUIREMENTS_TRACEABILITY.md): propostas e pendências.

## Referências por domínio

| Área | Documentos |
|---|---|
| Arquitetura e contratos | [Arquitetura](ARCHITECTURE.md), [API](API.md), [Modelo de dados](DATA_MODEL.md), [ADRs](ADR/README.md) |
| Economia e progressão | [Economia](ECONOMY.md), [Balanceamento experimental](BALANCE.md), [Drops](DROP_TABLES.md) |
| UX e arte | [UI/UX](UI_UX.md), [Art Bible](art/ART_BIBLE.md), [Licenças](art/ASSET_LICENSES.md) |
| Assets | [Manifesto](Asset_Manifest.md), [Guia de aplicação](Asset_Usage_Guide.md), [Catálogo visual](Visual_Catalog.md), [Índice técnico](art/asset_inventory.json) |
| Segurança e operação | [Segurança](SECURITY.md), [Operação](OPERATIONS.md), [Desempenho](PERFORMANCE.md) |
| Qualidade e lançamento | [Plano de testes](TEST_PLAN.md), [Checklist de release](RELEASE_CHECKLIST.md), [Aceite local](MVP_ACCEPTANCE.md) |

AI_STATE é canônico na raiz; não criar cópias AI_State/AI_STATE em docs com informações divergentes. Manifesto canônico é Asset_Manifest.md; não criar ASSET_MANIFEST paralelo.

## Como interpretar o estado

“Regra aprovada” reproduz Master Prompt/pedido explícito; “proposto” detalha uma escolha a validar; “experimental” identifica parâmetros locais sujeitos a playtest; “implementado” exige código/teste e evidência — combate/economia local já têm evidência de F3; online tem implementação F5; comunidade tem implementação F6; mercado tem implementação F7; premium tem base técnica F8 de teste; provedores externos ainda não homologados. Documentos online/social/premium especificam preparação e gates, não serviços disponíveis.

[ONLINE](ONLINE.md) e API descrevem o online instalado; comunidade em [COMMUNITY_SYSTEMS](COMMUNITY_SYSTEMS.md); mercado em [MARKET_SYSTEMS](MARKET_SYSTEMS.md). F1–F7 têm implementação em seus escopos; F8 tem base de teste local; F9–F10 são futuras. O acervo foi inventariado tecnicamente; licenças e mapeamento visual de todos os frames não estão concluídos. Não confundir esses tipos de conclusão.

## Manutenção

Mudança de produto atualiza GDD/Constituição se necessário, ADR/DECISIONS, testes de aceite e AI_STATE. Mudança de parâmetro cria configVersion e evidência de simulação. Ao adicionar/remover assets, regenerar auditoria com `python docs/tools/audit_assets.py` (Pillow) e revisar guias curados. Comandos executáveis e limites atuais em DEVELOPMENT.

Execução atual: [DEVELOPMENT](DEVELOPMENT.md), [relatório F1](STAGE_01_REPORT.md) e [ADR-005](ADR/0005-foundation-tooling.md).

Entrega visual atual: [STAGE_02_REPORT](STAGE_02_REPORT.md), [guia de recortes runtime](art/RUNTIME_ASSETS.md) e [registro de hashes](art/Runtime_Asset_Manifest.json).

F2: [relatório com capturas](STAGE_02_REPORT.md) e [guia de integração real](art/RUNTIME_ASSETS.md).

F3: [relatório jogável](STAGE_03_REPORT.md), [ADR-007](ADR/0007-local-loop.md), [simulação](phase3-balance-results.json) e guia de execução atualizado.

F4:[sistemas RPG](RPG_SYSTEMS.md),[ADR-008](ADR/0008-local-rpg.md),[validação F3](STAGE_03_VALIDATION.md),[relatório F4](STAGE_04_REPORT.md) e[simulações](phase4-rpg-results.json).

F5: [execução e segurança online](ONLINE.md), [ADR-009](ADR/0009-authoritative-online.md), [relatório F5](STAGE_05_REPORT.md).

Preview Windows: [LOCAL_PREVIEW](LOCAL_PREVIEW.md) e jogar.bat na raiz.

F6: [sistemas de comunidade](COMMUNITY_SYSTEMS.md), [ADR-010](ADR/0010-community-authority.md), [relatório F6](STAGE_06_REPORT.md).
