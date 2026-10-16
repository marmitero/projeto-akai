# P7 — Sistema na batalha

16/10/2026. Publicada após a P6, com autorização explícita em16/10/2026.

A batalha recebe painel com abas Global/Sistema no lugar dos antigos cartões de atributos. Sistema mostra recompensas por inimigo derrotado (Coins, XP do guerreiro/rei, item e conversão em ferro quando a mochila está cheia), vitória de onda/encontro, derrota e timeout do boss. Os valores são diferenças reais capturadas dentro da transação de combate, não estimativas da interface nem variações gerais de saldo. Sem mensagens por mineração/compra, sem recompensa por dano parcial e sem efeito sobre a economia/RNG.

`battle.reports` contém até60registros e `reportSerial` ordena o histórico. O domínio escreve ao confirmar cada resultado, antes de alterar o andar no fallback de boss. Defaults vazios carregam saves antigos sem fabricar eventos retroativos. O histórico acompanha snapshots e save local; no online é produzido pelo mesmo domínio do servidor e não por comandos do cliente. Publicação futura exige builds cliente/servidor compatíveis com os novos campos. Nenhuma tabela/migração SQL ou schemaVersion nova.

A lista usa texto seguro, tem limite fixo e não duplica registros em ticks/recarga. Acompanha os mais recentes enquanto o jogador está no fim; preserva leitura manual e oferece botão de novas entradas. Abas têm semântica acessível e navegação por setas/Home/End. O histórico não é anunciado inteiro a cada atualização.

Controles/status foram compactados na faixa inferior da arena, abrindo espaço para o painel sem reduzir a arena. Na referência484×730, painel e menu cabem na tela com perfil já definido. Janelas menores/paisagem ou formulário inicial podem exigir rolagem vertical. Global ainda não contém a conversa embutida: local informa necessidade de modo online; online oferece acesso ao chat da Comunidade existente. Integração na própria aba é P8, sem chat simulado nem segundo poller.

Validação completa:170testes/16arquivos passaram com PostgreSQL real, sem skips. Inclui11novos testes sobre resultados, bônus, loot, conversão, timeout, persistência, limite, formatação e contas online antigas. Harness local usa PostgreSQL18.4; CI usa PostgreSQL16. Typecheck/build passaram. Smokes específicos dev/preview: recompensa/vitória reais, recarga sem duplicação, abas/teclado, texto malicioso sem HTML, limite60, rolagem preservada, botão recentes, derrota/timeout,320/390/844px e encaixe484×730. Loop completo dev/preview:50ciclos por modo,54texturas/70objetos estáveis, nenhum pageerror. Evidências em polish-battle-p7-*.json e polish-p7-screenshots.

Comandos: `node scripts/smoke-battle-journal.mjs` e `--preview` após build; loop `node scripts/smoke-browser.mjs` e `--preview`. AKAI_CHROMIUM_EXECUTABLE opcional. Smokes online P7 dev/preview passaram com banco/servidor reais: conta antiga sem campos de journal, recompensas confirmadas, recarga, reinício da API e reconexão sem duplicações. Conciliação de ledger passou no teste de integração. Evidência online em polish-battle-p7-online-*.json. Sem aparelho físico ou soak30min.

Publicação da P7 autorizada explicitamente em16/10/2026, após completar PostgreSQL/online. CI/publicação concluídas. Próximo: P8 integra conversa Global ao painel, reutilizando serviço/estado/moderação. Monetização permanece adiada e F9 não iniciada.


P7 publicada após autorização explícita: [PR3](https://github.com/marmitero/projeto-akai/pull/3), merge `7033dde145fea04444f2266cf6f28cdee7bac066`. Head validado `a397e225c800214cc6c9edb730409c500653b06b`, árvore `015e070abe618072941089e2cd2210380b7cd317`. [CI principal38923516737](https://github.com/marmitero/projeto-akai/actions/runs/38923516737) e [Windows38923516798](https://github.com/marmitero/projeto-akai/actions/runs/38923516798) aprovados.170testes PostgreSQL16 sem skips e regressões completas local/online/dev/preview. Sem pendência técnica obrigatória da P7. Próxima implementação: P8, conversa Global integrada; sem F9 ou monetização automática.
