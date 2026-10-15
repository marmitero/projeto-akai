# Projeto Akai

RPG idle clicker 2D mobile-first, planejado para navegador e futura versão Android. Combina batalha automática, mineração ativa e minas de produção em três telas independentes com navegação inferior.

**Estado atual: F1–F4 locais, F5 online e F6 comunidade implementadas em desenvolvimento.** Mais→Comunidade no modo online: chat, guildas/brasões, arena, rankings/temporadas e eventos. F6 validada localmente; publicação/CI remota pendentes. Perfil local/jogar.bat continuam separados. Sem deploy público ou pagamentos. [Comunidade](docs/COMMUNITY_SYSTEMS.md), [relatório F6](docs/STAGE_06_REPORT.md), [documentação](docs/README.md).

Comece pelo [AI_STATE](AI_STATE.md) e pelo [índice da documentação](docs/README.md). As regras do produto estão na [Constituição](docs/00-CONSTITUICAO.md) e no [GDD](docs/GDD.md); sequência de entregas no [Roadmap](docs/ROADMAP.md).

O acervo de `sprites/` possui inventário técnico e guias de aplicação. Consulte o [Manifesto](docs/Asset_Manifest.md), o [Catálogo visual](docs/Visual_Catalog.md) e o [registro de licenças](docs/art/ASSET_LICENSES.md). Presença no repositório não significa licença comercial confirmada.

Para continuidade com uma IA ou colaborador, leia [CONTRIBUTING](CONTRIBUTING.md) e mantenha o estado real registrado, distinguindo especificação, experimento e funcionalidade testada.

Prévia visual: [relatório e capturas da F2](docs/STAGE_02_REPORT.md).

Entrega jogável: [relatório F3](docs/STAGE_03_REPORT.md), [configuração experimental](docs/BALANCE.md) e [decisão do loop](docs/ADR/0007-local-loop.md).

[![Project checks](https://github.com/marmitero/projeto-akai/actions/workflows/check.yml/badge.svg)](https://github.com/marmitero/projeto-akai/actions/workflows/check.yml)

## Testar no Windows

Baixe/extraia a pasta completa do projeto e dê dois cliques em **jogar.bat**. Ele prepara Node portátil quando necessário, instala dependências, confere sprites e abre o preview local no navegador. Na primeira execução é necessário acesso à internet. Mantenha a janela aberta enquanto joga; Ctrl+C encerra. [Instruções e salvamento](docs/LOCAL_PREVIEW.md).
