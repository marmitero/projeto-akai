# Polimentos de batalha

Pedido do usuário em 16/10/2026. Monetização adiada para a fase final conforme [backlog preservado](MONETIZATION_DEFERRED.md). Referência visual: Screenshot_8.png enviada na conversa. Não avança automaticamente para a F9.

## P1 — movimento, contato e feedback

Implementação local: cenário com seis camadas em parallax e chão com deslocamento durante a busca; protagonista ancorado enquanto corre; inimigos entram fora da tela pela direita, caminham até a formação e fecham vagas de aliados derrotados. Distância calculada pelas silhuetas/pivôs e escala normal/boss, não pela largura transparente do frame. Metadados de apresentação aceitam alcance corpo a corpo ou à distância; nenhum arqueiro foi adicionado ao domínio.

Feedback de golpes com animações existentes, impacto, flash e números ascendentes do HP efetivamente perdido, com pool limitado de objetos. Redução de movimento mantém cenário estático e posições finais. Pausa/ocultação/modal impedem deslocamento. Economia, relógio e recompensas continuam autoritativos, sem depender da animação. Originais dos sprites preservados; caminhada derivada reproduzível com `python scripts/prepare-battle-polish-assets.py`.

Críticos permanecem pendentes: o domínio atual não informa um golpe crítico. Ao implementar a regra autoritativa, transmitir seu resultado para o renderer e destacar o efeito/número; não sortear um crítico apenas visual. Números atuais representam dano confirmado entre snapshots, podendo reunir golpes quando atualizações chegam agrupadas.

## P2 — HUD compacta da tela Batalha

- Reduzir cabeçalho; recorte real do torso/rosto do protagonista, nick definido no início/conta e guilda abaixo somente quando existir.
- Remover AK, PROJETO AKAI, Reino em Ascensão, Local e rótulos da faixa MVP LOCAL até BATALHA. Subir a arena e manter melhorias acessíveis no primeiro enquadramento, verificando 320/390/768px e alturas reais; evitar prometer ausência de scroll em qualquer tela arbitrária.
- Agrupar Coins, Ferro, Carvão, Ruby e Ouro à direita com ícones do acervo; usar `sprites/Misc/Tools/Icon286.png` para Coins. Manter saldos e acessibilidade textual corretos.
- Recortar os quatro papéis da folha124×45 `sprites/Hud/20250420manaTabB-Sheet.png` e alternar no varal do topo da arena. Destacar numeral atual e mostrar até dois andares anteriores e dois próximos, respeitando limites da torre.
- Substituir painel grande de HP por indicadores sutis dentro da arena, usando assets existentes e escala correta para normal/boss. Preservar leitura acessível do estado e ações de pausa/retry.

## Validação

Testes de geometria, navegador com saves locais isolados para entrada/contato normal e boss, parallax/pausa e redução de movimento; regressão do loop local em dev e preview, typecheck, hashes e builds. Evidência em `polish-battle-p1-*.json` e `polish-screenshots/`. Capturas não representam o layout P2, ainda pendente. Publicação da P1 é separada da autorização de publicar F8.

Comandos: `npm run check`, `AKAI_CHROMIUM_EXECUTABLE=/caminho/chromium node scripts/smoke-battle-polish.mjs` e a variante `--preview` após build local. A variável de Chromium é opcional com Playwright instalado normalmente. Regressões completas: `node scripts/smoke-browser.mjs` e `node scripts/smoke-browser.mjs --preview`. Resultado desta entrega:146testes/13arquivos com PostgreSQL real; desenvolvimento e preview aprovados,50ciclos de navegação por modo com52texturas/58objetos estáveis e zero pageerrors. Sem novo soak30min ou aparelho real.
