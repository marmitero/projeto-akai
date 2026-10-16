# Polimentos de batalha

Pedido do usuário em 16/10/2026. Monetização adiada para a fase final conforme [backlog preservado](MONETIZATION_DEFERRED.md). Referência visual: Screenshot_8.png enviada na conversa. Não avança automaticamente para a F9.

## P1 — movimento, contato e feedback

Implementação local: cenário com seis camadas em parallax e chão com deslocamento durante a busca; protagonista ancorado enquanto corre; inimigos entram fora da tela pela direita, caminham até a formação e fecham vagas de aliados derrotados. Distância calculada pelas silhuetas/pivôs e escala normal/boss, não pela largura transparente do frame. Metadados de apresentação aceitam alcance corpo a corpo ou à distância; nenhum arqueiro foi adicionado ao domínio.

Feedback de golpes com animações existentes, impacto, flash e números ascendentes do HP efetivamente perdido, com pool limitado de objetos. Redução de movimento mantém cenário estático e posições finais. Pausa/ocultação/modal impedem deslocamento. Economia, relógio e recompensas continuam autoritativos, sem depender da animação. Originais dos sprites preservados; caminhada derivada reproduzível com `python scripts/prepare-battle-polish-assets.py`.

Críticos foram implementados na P3 local: regra autoritativa com efeito/número baseado em hits confirmados. Ver POLISH_P3_REPORT. P1 permanece como evidência histórica anterior a essa regra.

## P2 — HUD compacta da tela Batalha (enviada ao rascunho PR1)

- Reduzir cabeçalho; recorte real do torso/rosto do protagonista, nick definido no início/conta e guilda abaixo somente quando existir.
- Remover AK, PROJETO AKAI, Reino em Ascensão, Local e rótulos da faixa MVP LOCAL até BATALHA. Subir a arena e manter melhorias acessíveis no primeiro enquadramento, verificando 320/390/768px e alturas reais; evitar prometer ausência de scroll em qualquer tela arbitrária.
- Agrupar Coins, Ferro, Carvão, Ruby e Ouro à direita com ícones do acervo; usar `sprites/Misc/Tools/Icon286.png` para Coins. Manter saldos e acessibilidade textual corretos.
- Recortar os quatro papéis da folha124×45 `sprites/Hud/20250420manaTabB-Sheet.png` e alternar no varal do topo da arena. Destacar numeral atual e mostrar até dois andares anteriores e dois próximos, respeitando limites da torre.
- Substituir painel grande de HP por indicadores sutis dentro da arena, usando assets existentes e escala correta para normal/boss. Preservar leitura acessível do estado e ações de pausa/retry.

## Validação

Testes de geometria, navegador com saves locais isolados para entrada/contato normal e boss, parallax/pausa e redução de movimento; regressão do loop local em dev e preview, typecheck, hashes e builds. Evidência em `polish-battle-p1-*.json` e `polish-screenshots/`. Capturas P1 preservadas. Capturas atuais P2 em `polish-p2-screenshots/`, evidências em `polish-battle-p2-*.json`. Publicação da P1 é separada da autorização de publicar F8.

Comandos: `npm run check`, `AKAI_CHROMIUM_EXECUTABLE=/caminho/chromium node scripts/smoke-battle-polish.mjs` e a variante `--preview` após build local. A variável de Chromium é opcional com Playwright instalado normalmente. Regressões completas: `node scripts/smoke-browser.mjs` e `node scripts/smoke-browser.mjs --preview`. Resultado desta entrega:146testes/13arquivos com PostgreSQL real; desenvolvimento e preview aprovados,50ciclos de navegação por modo com52texturas/58objetos estáveis e zero pageerrors. Sem novo soak30min ou aparelho real.

## Entrega P2 — 16/10/2026

Retrato recortado de hero-idle, nick salvo com escolha inicial local e fila de gravação que aguarda transações já abertas e edição pelo retrato; online usa o comando de perfil existente e confirmação do servidor. Guilda somente quando há vínculo confirmado, sem ocupar linha vazia. Cabeçalho menor com Coins (Icon286), Ferro, Carvão, Ruby e Ouro; saldo detalhado no botão de recursos. Título cosmético da loja preservado no perfil, deixando o cabeçalho reservado à identidade solicitada.

Faixas de marca/local e título grande da batalha removidos; dicas originais continuam nas demais atividades. Arena encostada no cabeçalho; controles e melhorias compactos. Quatro papéis recortados em células31×45 do asset indicado, alternados pelo andar com numeral atual destacado e até dois vizinhos de cada lado, incluindo limites1/1000 e quatro dígitos. Barras sutis de HP em sprites seguem herói/inimigos/boss, com semântica acessível mantida fora do desenho. Assets originais intactos; script `python scripts/prepare-battle-hud-assets.py` reproduz os recortes e máscara de preenchimento.

Leitura autenticada de identidade isolada (`community/identity`) impede que o cabeçalho renove presença em eventos. Teste PostgreSQL compara snapshot/relógio/presença e participação no boss antes/depois de leituras repetidas. O smoke local mantém a primeira transação IndexedDB aberta, altera o nick durante a gravação e só libera a transação após conferir a indicação de salvamento pendente; depois recarrega e verifica o nome. Regressões de comunidade exercitam nick/guilda confirmados, mudança de nome pelo retrato e recarga.

Comandos adicionais: `node scripts/smoke-battle-hud.mjs` e `--preview` após build local; `AKAI_POLISH_EVIDENCE=polish-battle-p2-motion AKAI_POLISH_SCREENSHOTS=polish-p2-screenshots node scripts/smoke-battle-polish.mjs` preserva a evidência histórica P1. `AKAI_COMMUNITY_EVIDENCE=polish-p2-community node scripts/smoke-community.mjs` separa a evidência nova da F6.

P1/P2 enviados ao [rascunho PR1](https://github.com/marmitero/projeto-akai/pull/1) após autorização explícita. P2:14e6a90; correção do smoke online:705b792. CI inicial detectou espera por banner removido; testes locais online dev/preview passaram após usar readiness do jogo. Sem merge/publicação na main. Monetização continua adiada.

P3 concluída localmente: críticos autoritativos5%/1,5×, hits confirmados e efeito dourado/número real. [Relatório P3](POLISH_P3_REPORT.md) detalha alteração experimental de combate, validação e evidências. Ainda separada do envio autorizado da P2.

Validação P2:149testes/14arquivos com PostgreSQL real, typecheck/hashes/builds local e online. Nove verificações de navegador passaram: HUD, movimento e loop local em dev/preview; comunidade em dev/preview; loja de teste em preview. Loop manteve54texturas/70objetos em50ciclos por modo, zero pageerrors. Melhorias visíveis sem rolagem nos viewports320×640,360×740,390×844 e768×1024. Evidência consolidada em [polish-battle-p2-validation.json](polish-battle-p2-validation.json).

16/10/2026: usuário autorizou explicitamente enviar P2 ao rascunho PR1 e prosseguir P3. Bloqueio anterior de autorização resolvido; monetização continua adiada.
