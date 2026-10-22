# V17 — temporadas autenticadas de ensaio

Em implementação. Mesmo roster/carteira/sessão V13; off pelos gates V13, sem migração de conta real. Semana via calendário America/Sao_Paulo (segunda00h). Início explícito no painel: não concede retroativamente prêmios da arena/guilda anteriores ao início do acompanhamento.

POST test-v2/seasons recebe commandId, expectedRevision, seasonRevision e action sync. Revalida sessão/admissão após locks, antes de replay. Conflito de payload409; revisão antiga retorna receipt rejected. GET repetível somente leitura mostra período acompanhado, fechamento pendente, oito arquivos e próprios16prêmios. Arquivos não contêm runIDs/secrets/atributos/recibos de terceiros.

Lock: guild41652016 → arena41652015 → seasonworld → runs canônicos ordenados → sessão/membros. Arena/guilda usam o mesmo lock de guilda e, após início, recusam novas ações se a semana venceu (receipts anteriores continuam recuperáveis). Fechar antes de sair/expulsar/transferir impede alterar vínculo retroativamente. Outros writers econômicos apenas serializam nas runs; não adquirem locks competitivos após runs. Nenhum motor root certificado R3–R8 foi alterado.

Fechamento único arquiva arena/troféus/posição e pontos de guilda, nomes congelados. Exclui contas indisponíveis e guildas inativas/vazias da seleção ativa. Arena: top3 troféus entre participantes de ataque ou defesa no intervalo acompanhado, desempateUUID,500/300/100Coin. Guildas: soma créditos nativos datados no intervalo, desempateUUID, membros atuais canônicos não suspensos/admitidos/abertos com24h de vínculo na fronteira recebem300/200/100Coin. Mesma conta pode receber as duas fontes. Unidades milliCoin. Fontes únicas semana/tipo/conta; wallet+ledger+archive+grants+receipt+outbox na mesma transação. Nenhuma Jade/proteção/domínio ou tempo de combate gerado. Revisions das carteiras beneficiadas avançam; confirmação antiga precisa de nova revisão.

Após ausência longa fecha somente a semana acompanhada e inicia a atual. Sem fabricar semanas vazias ou bônus vencidos. Relógio considera máximos dos mundos arena/guilda/temporadas, amostrado após locks. O arquivo preserva o intervalo trackedFrom, sem alegar acompanhamento anterior à implantação. Semanas antigas préV17 permanecem no histórico da arena, sem pagamento retroativo.

UI revisa/confirmar e salva intenção por conta antes do POST; recarga/resposta perdida usa mesmoUUID. Outros painéis bloqueiam enquanto a intenção está pendente. Texto via textContent; arquivo com nomes congelados, sem HTML de usuário. Nenhuma cobrança para acompanhar/fechar.

## Limites desta fatia

Bônus de XP legado não pode multiplicar segundos qualificados v2. XP de boss precisa fechamento diário durável anterior ao reset R8 e calibragem de dano; guerra autenticada ainda exige domínio próprio. Ambos permanecem próximos passos, não fontes fictícias ativas. O painel informa isso. Não certifica população/balanceamento/capacidade ou Android físico. Economia real,+16–20,monetização e activationReady continuamoff.
