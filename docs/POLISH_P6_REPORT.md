# P6 — Mina e Melhorias

16/10/2026. Publicada na main após autorização explícita do usuário. Head `f31ca2971938887a59eb482a6ad52aec79af64bc`. [CI principal38908937775](https://github.com/marmitero/projeto-akai/actions/runs/38908937775) e [Windows38908937828](https://github.com/marmitero/projeto-akai/actions/runs/38908937828) aprovados; suíte completa com159testes PostgreSQL e regressões online/dev/preview.

Mina reúne minério clicável, poder da picareta e minas automáticas de carvão, ouro e jade. Ações, limites, bônus, valores e condições de desbloqueio permanecem no domínio existente. A guarda de comandos RPG aceita as minas na nova tela Mina, preservando também os comandos da Mochila.

O botão Produção foi substituído por Melhorias, com Força do guerreiro e Vitalidade. Os cartões foram removidos da batalha. Melhorias é uma rota de interface, sem novo Screen no protocolo/save; mantém o último destino de jogo para Escape e retorno. O renderer fica oculto nessa tela, inclusive após fechar um modal. O domínio continua avançando normalmente. Na batalha o espaço permanece livre até a implementação das abas Sistema/Global.

Saves antigos em production são normalizados para mine ao abrir a sessão. O formato de save e o contrato online continuam compatíveis. Nenhuma migração de banco ou alteração econômica. O tutorial aponta Melhorias e Mina.

Validação: typecheck, build e68testes locais passaram;91testes PostgreSQL ficaram sem execução neste ambiente por ausência de TEST_DATABASE_URL (não contados como aprovados). Smokes do loop em dev/preview passaram: compras e recarga de Força/Vitalidade, produção, minas avançadas, save antigo em Produção, mineração real, Escape/modal,50ciclos por modo, larguras320/360/390/768/844, paisagem e54texturas/70objetos estáveis. Zero pageerrors. HUD em dev/preview também aprovado, com evidências P6 separadas da P2 histórica.

Comandos: `node scripts/smoke-browser.mjs` e `--preview`; `AKAI_HUD_SCREENSHOTS=/caminho/capturas AKAI_HUD_EVIDENCE=polish-battle-p6-hud node scripts/smoke-battle-hud.mjs`. Chromium opcional via AKAI_CHROMIUM_EXECUTABLE. Evidência consolidada em polish-battle-p6-validation.json. Sem nova validação online de navegação com servidor nesta fatia, aparelho físico ou soak30min.

Próximo: P7 — aba Sistema com resultados/recompensas confirmados, seguida da integração Global P8. Monetização adiada, sem F9 automática.
