# P3 — críticos da torre

16/10/2026. Implementação local autorizada após o envio da P2. Monetização permanece adiada até a fase final.

## Regra e autoridade

Chance experimental5% (500/10000), multiplicador1,5× no ataque automático do protagonista contra inimigos e bosses da torre, incluindo treino. Aplica após o multiplicador de dano da torre, com arredondamento para baixo e limite no HP restante do alvo. O número apresentado é o HP efetivamente perdido; um crítico letal de potencial9 contra HP4 mostra4. Não acrescenta poder permanente nem muda as fórmulas diretas de arena, guerra ou boss global. Progressão mais rápida pode influenciar poder futuro; não equivale a equilíbrio competitivo validado.

No online, o domínio usa a fonte aleatória criptográfica já fornecida pelo servidor. No local, usa o RNG persistido do domínio; a nova rolagem consome esse fluxo e pode alterar a sequência de drops, preservando suas probabilidades configuradas. O cliente não envia crítico, dano ou acerto como comando aceito. Nenhum sorteio no renderer.

## Confirmação e apresentação

`battle.hits` contém até8 golpes recentes, com strike, tentativa, índice do alvo, dano confirmado e flag de crítico. Salvos no snapshot da transação autoritativa já existente, junto das demais alterações. Leitura repetida não rerrola. Campo aditivo com default[] para carregar saves anteriores schema3 e migrações1/2; não inventa eventos históricos. Nova tentativa limpa a fila. Renderer consome apenas strikes novos da tentativa visível, sem repetir efeitos ao recarregar ou retornar de uma tela oculta.

Crítico mostra texto dourado maior e impacto/flash usando o sprite existente. Dano normal mantém o estilo anterior; golpes recebidos mantêm vermelho. Pool fixo preservado, sem novos objetos/texturas por golpe. Redução de movimento mantém o rótulo legível, sem impacto animado. Nenhum asset original foi alterado.

## Validação

156testes em14arquivos com PostgreSQL real, typecheck, hashes/builds; testes novos cobrem limiar499/500, multiplicador e composição única com bônus de dano, clamp letal e recompensa única, limite da fila, migração sem hits retroativos, RNG segmentado e snapshot online persistido sem rerrolagem. Contratos recusam campos crítico/hits fornecidos pelo cliente.

Smokes críticos dev/preview usam um save local isolado com RNG1 e alvos resistentes: o próprio motor produz o crítico9; nenhum flag visual é forçado. Exercitam recarga sem replay, redução de movimento e pool54texturas/70objetos. Loop completo local em dev/preview mantém50navegações e zero pageerrors. HUD, online, mercado e loja de teste revalidados nos modos indicados na evidência consolidada. Simulações determinísticas de loop/RPG registradas separadamente das históricas F4.

Usuário autorizou publicar P3 em16/10/2026; envio/merge em preparação após verificações. Sem merge na main, sem início da F9 e sem ativar monetização. Próximo passo: avaliar estes parâmetros e o resultado visual em playtest.
