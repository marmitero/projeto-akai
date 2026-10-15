# Validação da Fase 3 antes da progressão RPG

15/10/2026. Revisão solicitada pelo usuário antes de iniciar F4. Base exata: `54c615a02357df3a122b8f6da17b43fcc55e66f0`, tree `e6aa80af7a10fdaaea064b6e39fe93cee33f7767`.

## Evidência conferida e repetida

- CI original [38746492933](https://github.com/marmitero/projeto-akai/actions/runs/38746492933): conclusão success no commit acima, incluindo checks, simulação e smokes dev/produção.
- Checkout novo e `npm ci`; `npm run check` repetido antes das alterações: hashes, TypeScript, **31 testes** e builds passaram.
- Smoke do build estático original repetido com Chromium153.0.8010.0:50 ciclos,34 texturas/37 objetos, mineração/compra/carvão/offline, pausa/boss/treino, vitória com outra tela ativa, menus/foco/tamanhos/horizontal e falha de asset; zero pageerrors/respostas de assets com erro.
- Sessão real de30min anterior foi conferida em [phase3-browser-soak.json](phase3-browser-soak.json), não repetida como se fosse evidência nova:1.800.914ms,1.784 ciclos,127 listeners constantes, heap5,91–6,64MiB,34 texturas/37 objetos. Limite: headless/software, não Android.

## Resultado e correção pequena

Sem bloqueador funcional para F4. Na revisão das regras, vitalidade podia elevar HP de0 para15 mesmo com a tentativa derrotada. A F4 corrige o comando para acrescentar HP atual somente se o guerreiro estiver vivo; retry ainda restaura a vida inteira. Teste de regressão em rpg.test.ts. Não altera custos nem remove a pausa após derrota.

A migração real2→3 ganhou testes para combate ativo preservado, remainder convertido sem perder fração e conclusão do20 retomando no21, com a cura normal entre andares. Nenhuma recompensa ou XP retroativa foi inventada.

Licenças, playtest humano e aparelho real continuam gates próprios. A validação do loop local não comprova segurança econômica online, balanceamento comercial ou conteúdo artístico exclusivo de1.000 andares.
