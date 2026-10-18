# Bestiário comum — entrega common-1

Reconstrução em 18/10/2026. Escopo exclusivo de inimigos comuns; monetização continua adiada. [Fichas completas e curvas](BESTIARY.md), [inventário](asset-inventory.json), [prancha visual](contact-sheet.png).

## Implementado

27 fichas: 19 visuais de pacotes não modulares e oito composições Male/Female Base. Cinco papéis com HP, dano, intervalo, XP e Coins próprios; seleção determinística por elegibilidade e andar, sem consumo extra do RNG de loot. Arqueiros atacam da formação com projéteis cosméticos; inimigos de corpo a corpo se aproximam pela silhueta da família. Células transparentes de padding são excluídas ao reamostrar as animações; um verificador PNG sem dependências valida os702frames ativos dos27atlases em check:assets. Animações idle/caminhada/ataque/morte e barras de HP ajustadas ao tamanho.

Mais → Bestiário permite consultar todas as fichas e simular atributos de um andar sem alterar o combate ou conceder recursos. O diário registra a identidade e os deltas confirmados de recompensas. Cliente local e servidor usam as mesmas definições compartilhadas; no online o servidor permanece autoritativo.

Campos opcionais `templateId`/`enemyId` adicionados ao schema3, sem migração SQL. Saves antigos sem identidade continuam funcionando e recebem as fichas no próximo encontro. Atualizar cliente e servidor juntos. Bosses mantêm fórmulas, sprites, animações legadas, recompensas, timeout e geometria de contato de22px; `content.ts` e os sprites originais não foram alterados. As recompensas comuns podem mudar indiretamente a preparação do jogador para bosses.

## Validação local desta reconstrução

- `npm run check` com PostgreSQL18.4 real: **177 testes em17arquivos, todos aprovados, sem skips**, além de tipos, hashes/dimensões de assets e build.
- Simulação de900andares comuns:900vitórias com build de referência,27fichas presentes até o andar81, curvas individuais deHP/ataque/XP/Coins sem regressão.15–33s por andar nessa referência.
- Smokes específicos dev/preview:27identidades/renderizações, contato de16px, preservação do boss, disparo de arqueiro, catálogo e larguras320/390/768, sem erros de página.
- Regressão geral dev/preview:50ciclos de navegação por modo, salvamento/reload, produção, mineração, melhorias, forja/equipamento/pet, offline, pausas, timeout/treino de boss e conclusão da torre.82texturas/73objetos estáveis.
- Online dev/preview: conta convidada, mineração, cookieHttpOnly, isolamento do save local, catálogo, recompensas confirmadas, resposta perdida sem duplicação, reinício, diário, recuperação entre dispositivos e logout. Evidências `online-dev.json`/`online-preview.json`.

A CI foi atualizada para obter toda a pasta Enemies e executar a nova simulação e os dois smokes do bestiário. Seu PostgreSQL16 é descartável, com trust somente no runner isolado e porta ligada ao loopback, sem senha fixa versionada; essa configuração não se aplica ao servidor do jogador.

## Limites

A simulação fornece equipamentos comuns e melhorias de referência; não simula aquisição, ritmo de farm ou todas as builds. Não comprova balanceamento humano/comercial: o playtest deve orientar ajustes. Não houve medição deGPU em aparelho real ou teste manual do Windows nesta reconstrução. A CIWindows verifica o launcher separadamente.

Os27atlases representam aproximadamente67,5MiBRGBA antes de overhead. Conteúdo gerado e receitas são rastreáveis, sem modificação dos originais ou nova licença presumida.

## Publicação e continuidade

**Publicado na main em18/10/2026** pela PR4. Merge: `a440640cee5528f7568de8be63a3824bffb5520b`. Head da implementação validada: `cfe90c78e80bfec066852eef196ce65863c82b5d`; árvore: `3cf9ccf86deed20a3c131eb483084db1d7093d7a`. [Project checks/PostgreSQL16](https://github.com/marmitero/projeto-akai/actions/runs/39124955299) e [Windows local preview](https://github.com/marmitero/projeto-akai/actions/runs/39124955224) **aprovadas**; PostgreSQL16 executou177testes/17arquivos sem skips e verificou702frames. O Windows executou o BAT real com Node portátil e smoke de navegador.

Base anterior: `e39540d2f7d1ac4382ca93352541a8a086b8584a`. Um rollback pode reverter o merge, preservando commits e a regra permanente de publicação. Este fechamento altera apenas documentação; as CIs citadas validam a implementação acima.

[PR4](https://github.com/marmitero/projeto-akai/pull/4). A regra permanente em `AGENTS.md` e `AI_STATE.md` exige validação e publicação ao final de cada etapa, sem nova confirmação, com checkpoints remotos em trabalhos longos. Rollback por revert preservando histórico. Checkpoint da reconstrução: `3c215904df3580e731aa9ef1dad52bf956c86dd6`. Etapa integrada após ambas as CIs aprovarem o head final.

## Playtest

Baixar a versão atualizada de main, extrair e executar `jogar.bat` para o modo local ou `servidor.bat` para o online. Não é necessário apagar o save. Um encontro antigo pode conservar a aparência anterior até a próxima onda. Em Mais → Bestiário, consultar nomes, papéis, desbloqueios, atributos e recompensas. Verificar principalmente ritmo de progressão, sobrevivência, contato dos golpes, leitura dos tamanhos e retorno de XP/Coins; reportar andar/onda/build quando houver dificuldade excessiva ou facilidade indevida.
