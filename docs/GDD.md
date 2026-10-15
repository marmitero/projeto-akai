# Game Design Document — Projeto Akai

Baseline de design v1, 15/10/2026. Regras do Master Prompt preservadas; detalhes novos identificados como propostas. Fundação, apresentação e loop local1–20 implementados (F1–F3); F4 RPG implementada localmente; online/social/premium permanecem especificação.

## Experiência e loop

Fantasia medieval 2D lateral. O rei é identidade da conta; o guerreiro é ator de combate, com progressão distinta. A conta possui apelido público único, nível e retrato apenas na HUD/perfil. Heróis recrutados e mascotes não se confundem com a conta.

O jogador acompanha Batalha, alterna para Mina para obter ferro, compra melhorias, desbloqueia Produção e usa ganhos para superar bosses. Batalha e minas seguem em outras telas. O objetivo inicial é avançar, não mover manualmente o herói pelo cenário. Não haverá joystick ou mapa explorável no MVP.

## Batalhas e torre

1. Iniciar andar elegível e primeira onda.
2. Andar comum contém três ondas; cada uma possui três inimigos. Proposta inicial: inimigos simultâneos, herói ataca o primeiro vivo, inimigos atacam por agenda própria. Confirmar legibilidade no protótipo.
3. Ataques seguem cooldown, atributos e efeitos. Cada morte emite recompensa única.
4. Após a terceira onda, marcar andar e avançar com caminhada/transição de cerca de três segundos. A transição ocorre entre ondas/andares conforme configuração visual, sem duplicar recompensas.
5. Andares 10, 20 etc. têm uma única onda e um boss. Vida esgotada ou tempo do boss encerrado resulta em falha; empate no instante limite usa ordem determinística documentada em BALANCE.
6. Falha de boss retorna ao andar anterior e desliga autoavanço. Implementado: permanecer pausado sem refarm automático; Tentar novamente inicia nova tentativa. Treinar no andar anterior repete uma execução comum9/19 e volta a pausar, fornecendo Coins sem iniciar boss automaticamente (ADR-007).

Andares comuns não expiram. Proposta para morte em andar comum: pausar, mostrar causa e permitir reiniciar esse andar sem cobrar moeda; recompensas de inimigos efetivamente derrotados ficam, mas cada nova execução recebe IDs novos. Política precisa de teste contra exploração antes do online. Não há perda de item permanente planejada. Meta final: 1.000 definições de andares por dados; reuso artístico por bioma e dificuldade, sem mil packs exclusivos.

## Mineração e automações

Ferro manual começa com 1 por clique. Melhorias previstas: ganho/clique, mineradores, eficiência, multiplicadores e perks com coins. No MVP, começar por ganho/clique e força/vida do guerreiro; demais categorias continuam no roadmap. Feedback visual imediato não é prova de crédito online.

Carvão desbloqueia com ferro e coins e produz automaticamente. Ouro exige carvão nível 50 e custos em ferro/carvão/coins. Jade exige custos em ferro/ouro/carvão/coins, sem requisito numérico adicional aprovado. Produção mostra custos, níveis, recurso/s e bloqueios. O sprite de minério não habilita clique manual em carvão, ouro ou jade.

## Economia e fortalecimento

Coin vem de batalha e paga melhorias/desbloqueios. Ferro sustenta guerreiro, equipamentos, mascotes, minas e fabricação. Carvão participa de equipamentos e ferro fundido; ouro e jade atendem progressão avançada. Ruby é premium, emitido por compras verificadas e recompensas explícitas. Receitas exatas de fabricação, limites e afixos seguem ECONOMY/BALANCE; ausência de receita aprovada não autoriza inventar conversão.

## Equipamentos e loot

Armas: espada, adaga, machado, maça, duas mãos, lança, arco; defesa/vestes: escudo, peitoral, chapéu, luvas, botas; acessórios: colar e anel. Proposta de slots: uma arma, um escudo quando compatível, peitoral, cabeça, mãos, pés, colar e dois anéis. Duas mãos bloqueia escudo. Modelo adotado localmente na F4 sob delegação, com testes; não implica mercado online disponível.

Itens têm definição, instância única, nível/requisito, raridade, atributos e eventual vínculo/negociabilidade. Ícone não é roupa do rig. Raridades propostas: comum, incomum, raro, épico, lendário; afetam atributos e quantidade de afixos, não só borda. Drops raros em comuns e melhores em bosses; nenhum inimigo entrega equipamento garantido. Detalhes e probabilidades provisórias em DROP_TABLES.

## Mascotes, habilidades e fabricação

Mascotes têm sprite validado, nível, raridade, passivos e custos; proposta inicial de um mascote ativo para controlar complexidade. F4 usa Musgo, Slime green do acervo, como companheiro domesticado, com critérios no ADR-008. Habilidades são melhorias/passivos ou ações automáticas do guerreiro; não introduzir combate manual por omissão de especificação. Cada habilidade precisa de gatilho, alvo, cooldown, duração, empilhamento e dispel antes de implementar. Mascote e tônicos implementados na F4; habilidades avançadas permanecem expansão. Fabricação deve debitar ingredientes e criar resultado atomicamente; sem receita aprovada, botão permanece ausente.

## Eventos e retenção

Boss global diário às 22h em America/Sao_Paulo, relógio e edição definidos no servidor. Dano agregado, contribuição, faixas de prêmio e último golpe único. Reconexão não reaplica dano. Mini raid individual concede baú; bônus XP de 30% dura seis horas; loteria sorteia 100 rubies entre elegíveis online. Abrangência, elegibilidade, cooldown e prêmio de cada edição precisam de configuração antes da ativação.

Retenção: retornar para produção acumulada, próxima melhoria e desafio de boss. Não punir ausência, impor conexão contínua ou fazer evento essencial depender de anúncio. Tutorial proposto: observar vitória → minerar → melhorar → desbloquear carvão → entender boss; passos retomáveis, sem bloquear toda a HUD.

## Comunidade, mercado e competição

Mercado reserva itens anunciados, compra atômica e contraoferta com prazo. Referências iniciais: taxa 10%, anúncio 100.000 coins, duração três dias, cooldown 24h para relistar o mesmo item removido antecipadamente. Valores econômicos são provisórios e sujeitos a simulação; relógio é do servidor. Ruby negociável fica desabilitado até revisão específica.

PvP apresenta até cinco adversários imediatamente acima. Vitória toma posição segundo atualização serializada; derrota mantém posição e perde troféus conforme fórmula futura. Posição e troféus são rankings distintos. Não inventar jogadores; bots precisam de rótulo. Empate proposto: defesa vence, sem transferência de posição, sujeito a aprovação no design de PvP.

Guilda começa com 20 membros no nível 1; proposta para resolver contagem: capacidade = 20 + 2×(nível−1), máximo nível 10, 38 membros. Regra requer confirmação antes da fase social. Chat, cargos, convites, brasão em grade limitada, guerra e ranking semanal. Bônus global de ataque proposto de 1% por membro simultaneamente participante; limite/contagem do próprio jogador pendentes. Não ativar sem especificação.

Rankings: força, maior andar, saldo Coin, dano global, último golpe, guilda, posição PvP e troféus. Permanentes e semanais separados; fechamento arquiva temporada e paga uma vez. Reset não apaga histórico. Fórmulas de força e troféus ainda pendentes.

## Monetização e offline

Anúncios exclusivamente voluntários: 120s de autoclick a 3/s, ou 120s de dano 2×, ou recompensa de batalha 2×, ou coins conforme progresso. Cooldowns e acúmulo precisam de definição; em local apenas debug rotulado. Loja premium prevê ruby (Punhado/Saco/Pote/Baú), cosméticos, bônus e pacotes; preços não aprovados. Não transformar teste local em compra real.

Offline local implementado experimentalmente: produção de minas até oito horas; sem combate, cliques ou autoplay offline no MVP. Bônus temporários só contam durante intervalo válido. Online usa tempo confiável e saldo de servidor; save local nunca importa recursos para conta online. Ver ADR-003.

## Interface, áudio e acessibilidade

Batalha, Mina, Produção, Mochila, Loja e Mais; uma tela ativa, HUD persistente. Ícones reais e rótulos, números legíveis, estados de erro e reconexão, opção reduzir movimento. Áudio não existe no acervo; não é requisito bloqueante do MVP local. Controles de volume e áudio só aparecem quando houver sons licenciados integrados. Especificação em UI_UX e ART_BIBLE.

## Marcos de conteúdo

Primeira fatia proposta: andares 1–20, dois encontros de boss, clicker e carvão. Equipamentos/mascotes/ouro/jade no incremento RPG; todo o conteúdo de 1.000 andares só será aceito após validação de curvas e dados. Nenhum sistema futuro foi removido; dependências e aceite estão no ROADMAP.

## Entrega jogável F3

Herói com força/vitalidade/clique melhoráveis, carvão e tutorial; níveis experimentais até100, cura entre andares/tentativas e prazo de boss também durante pausa/ausência. Primeiro conteúdo20 andares e Guardião Ossudo da família Skeleton nos10/20, Run de transição e morte real. BALANCE registra simulação, sem inferir diversão/equilíbrio final. Equipamentos/pets/XP/fabricação/ouro/jade estão reservados aF4. Não há perda de itens, cobrança, premium ou luta offline.

## Entrega F4

14 categorias/9 slots,5 raridades, afixos, drops raros, inventário120, Forja/ferro fundido/aprimoramento/reciclagem, dois tônicos, Musgo evoluível e minas ouro/jade integrados. XP do rei e guerreiro separados; equipamento/pet não cura ao trocar. Catálogo1–1.000 com curvas polinomiais após20, mesmo bioma/família lateral; cenário exclusivo/rig por item não foi inventado. Regras/custos/limites em RPG_SYSTEMS, evidência em STAGE_04_REPORT.

A simulação de percurso completo com atributos finais prova agenda/limites, não ritmo natural até1.000. XP novo tornou primeiros20 mais rápidos que F3; os resultados antigos foram preservados e o config versionado. Sem anúncio, Ruby, loot offline ou preço real para progredir. Migração mantém progresso e recursos existentes.

## Atualização F5 — 15/10/2026

F5 adiciona modo online isolado: contas começam do zero, mesmas regras RPG da configuração local-rpg-1, com tempo/custos/RNG determinados pelo servidor. Combate conserva até3s de presença após queda abrupta; depois só minas até8h e prazo do boss. Navegação interna continua sem pausar o domínio. [ONLINE](ONLINE.md) detalha regras técnicas e limitações. Social, loja premium e mercado não foram ativados.

## Atualização F6 — 15/10/2026

F6 implementa chat/guildas/brasões/arena/rankings/temporadas/boss diário e eventos relâmpago/guerra em desenvolvimento. Regras adotadas atualizam as propostas acima: capacidade20–38, força10ATQ+HP+20DEF, empate favorece defesa, troca de posições, janelas/calendário/recompensas e papéis definidos em COMMUNITY_SYSTEMS/ADR-010. Valores são experimentais e testados tecnicamente, sem alegar equilíbrio humano ou publicação pública. Sem bots, merge de saldo local, pagamentos ou mercado.
