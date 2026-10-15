# ADR-002 — Três telas com simulação independente

Data: 15/10/2026. Estado: aceito — alteração explícita do usuário, incorporada ao Master Prompt. Não implementado.

## Contexto

Layout anterior colocava combate, clicker e automações em faixas da mesma tela. A solicitação exige cada atividade em uma tela, compartilhando navegação inferior e menus.

## Decisão

Batalha, Mina e Produção são destinos independentes; HUD inferior com Mochila/Loja/Mais permanece. Apenas cena ativa recebe input/renderização. Store/simulação, relógio econômico, sessão de batalha e conexão vivem fora das cenas. Navegar não dá recompensa offline nem reinicia timer. Falha de boss em outra tela coloca badge e mantém pausa até retry manual.

## Alternativas e consequências

Preservar as faixas não atende o pedido. Destruir/recriar domínio a cada navegação provocaria reset/duplicação e custo de carregamento. Estado compartilhado exige lifecycle explícito, listeners removíveis e testes de repetição. Asset loading por demanda controla memória. Nome Produção foi escolhido por representar as minas automáticas disponíveis no acervo; não introduz máquinas industriais.
