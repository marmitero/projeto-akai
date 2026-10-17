# Projeto Akai

RPG idle clicker 2D mobile-first, planejado para navegador e futura versão Android. Combina batalha automática, mineração ativa e minas de produção em três telas independentes com navegação inferior.

**Estado atual: F1–F4 locais, F5 online, F6 comunidade publicada e F7 mercado publicada; F8 técnica de monetização de teste publicada.** Mais→Comunidade no modo online: chat, guildas/brasões, arena, rankings/temporadas e eventos. Mais→Mercado oferece anúncios, compra, contraofertas, escrow e resgate no modo online. F7 publicada com CI aprovada. F8 desligada por padrão; simulador local validado, integrações externas Google/AdMob adiadas até a fase final; prioridade atual: polimentos. [Pendências preservadas](docs/MONETIZATION_DEFERRED.md). Perfil local/jogar.bat continuam separados. Sem deploy público ou pagamentos. [Monetização de teste](docs/MONETIZATION_SYSTEMS.md), [relatório F8](docs/STAGE_08_REPORT.md), [Mercado](docs/MARKET_SYSTEMS.md), [relatório F7](docs/STAGE_07_REPORT.md), [Comunidade](docs/COMMUNITY_SYSTEMS.md), [relatório F6](docs/STAGE_06_REPORT.md), [documentação](docs/README.md).

Comece pelo [AI_STATE](AI_STATE.md) e pelo [índice da documentação](docs/README.md). As regras do produto estão na [Constituição](docs/00-CONSTITUICAO.md) e no [GDD](docs/GDD.md); sequência de entregas no [Roadmap](docs/ROADMAP.md).

O acervo de `sprites/` possui inventário técnico e guias de aplicação. Consulte o [Manifesto](docs/Asset_Manifest.md), o [Catálogo visual](docs/Visual_Catalog.md) e o [registro de licenças](docs/art/ASSET_LICENSES.md). Presença no repositório não significa licença comercial confirmada.

Para continuidade com uma IA ou colaborador, leia [CONTRIBUTING](CONTRIBUTING.md) e mantenha o estado real registrado, distinguindo especificação, experimento e funcionalidade testada.

Prévia visual: [relatório e capturas da F2](docs/STAGE_02_REPORT.md).

Entrega jogável: [relatório F3](docs/STAGE_03_REPORT.md), [configuração experimental](docs/BALANCE.md) e [decisão do loop](docs/ADR/0007-local-loop.md).

[![Project checks](https://github.com/marmitero/projeto-akai/actions/workflows/check.yml/badge.svg)](https://github.com/marmitero/projeto-akai/actions/workflows/check.yml)

## Testar no Windows

Baixe/extraia a pasta completa do projeto e dê dois cliques em **jogar.bat**. Ele prepara Node portátil quando necessário, instala dependências, confere sprites e abre o preview local no navegador. Na primeira execução é necessário acesso à internet. Mantenha a janela aberta enquanto joga; Ctrl+C encerra. [Instruções e salvamento](docs/LOCAL_PREVIEW.md).

Para testar contas online, use **servidor.bat** (requer Docker Desktop instalado). Ele prepara banco, tabelas, API e cliente e abre o navegador, sem comandos manuais de PowerShell. Node portátil e dependências são preparados automaticamente. O banco conserva contas entre execuções. [Guia do modo online](docs/ONLINE.md#iniciar-com-servidorbat-no-windows).

Polimentos de batalha P1–P3 publicados: parallax, entrada dos inimigos, HUD compacta com perfil/recursos/varal/HP e críticos autoritativos experimentais5%/1,5×. [Relatório e validação](docs/POLISH_P3_REPORT.md). Monetização permanece adiada até a fase final.
