# Documentação do Projeto Akai

Baseline de planejamento — 15/10/2026. **F1 e F2 implementadas; loop jogável/econômico ainda não iniciado.** Leia [AI_STATE](../AI_STATE.md) antes de trabalhar. O usuário autorizou a próxima etapa em 15/10/2026. Comandos reais em [DEVELOPMENT](DEVELOPMENT.md); evidências em [STAGE_01_REPORT](STAGE_01_REPORT.md).

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

“Regra aprovada” reproduz Master Prompt/pedido explícito; “proposto” detalha uma escolha a validar; “experimental” identifica números sem simulação; “implementado” exige código/teste e evidência — nenhum sistema de combate/economia está neste último estado; apenas a fundação técnica foi implementada. Documentos online/social/premium especificam preparação e gates, não serviços disponíveis.

Contratos, schema e roadmap descrevem desenho futuro. F1 e F2 foram executadas em seus escopos; F3–F10 continuam futuras. O acervo foi inventariado tecnicamente; licenças e mapeamento visual de todos os frames não estão concluídos. Não confundir esses tipos de conclusão.

## Manutenção

Mudança de produto atualiza GDD/Constituição se necessário, ADR/DECISIONS, testes de aceite e AI_STATE. Mudança de parâmetro cria configVersion e evidência de simulação. Ao adicionar/remover assets, regenerar auditoria com `python docs/tools/audit_assets.py` (Pillow) e revisar guias curados. Comandos de instalação/build/teste do jogo só serão publicados quando houver implementação verificável.

Execução atual: [DEVELOPMENT](DEVELOPMENT.md), [relatório F1](STAGE_01_REPORT.md) e [ADR-005](ADR/0005-foundation-tooling.md).

Entrega visual atual: [STAGE_02_REPORT](STAGE_02_REPORT.md), [guia de recortes runtime](art/RUNTIME_ASSETS.md) e [registro de hashes](art/Runtime_Asset_Manifest.json).

F2: [relatório com capturas](STAGE_02_REPORT.md) e [guia de integração real](art/RUNTIME_ASSETS.md).
