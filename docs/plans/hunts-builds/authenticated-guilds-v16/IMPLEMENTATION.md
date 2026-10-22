# Fase 7 / V16 — guildas autenticadas de teste

Implementação em validação, autorizada após a arena V15. Consumidor de gestão, chat privado e XP de arena sobre a identidade/run/carteira canônica V13. Sem corte das guildas legadas ou economia real.

## Contrato de produto

Mais → Ensaio online v2 → Guildas online v2 de teste. Criar exige andar5, ausência de vínculo e500Coin v2 (500000unidades mínimas). Nome3–24letras/números/espaço/_/-, único entre guildas ativas sem distinguir caixa. Nível1–10, capacidade20+2×(nível−1), máximo38; o roster de ensaio continua limitado a20contas. Evoluir: líder, XP acumulado>=100×nível,1000×nívelCoin consumidos, XP não consumido. Sem reembolso ao encerrar.

Convite só a conta canônica disponível e sem guilda, válido24h. Aceite revalida vaga, convite e líder disponível, cria vínculo e cancela demais convites. Recusa/revogação explícitas. Líder promove/rebaixa/remove/transfere e edita brasão. Oficial convida/revoga e remove apenas membros comuns. Líder transfere antes de sair, exceto se for o último membro: encerra guilda e cancela convites, preservando histórico. Brasão16×16,256índices0–7 da paleta compartilhada, sem upload/SVG arbitrário.

Chat privado literal1–500caracteres, sem controles, intervalo3s por conta, até50mensagens após a entrada atual. Conta silenciada não envia; bloqueios existentes filtram autores. Cursor de mensagem congelado no ingresso impede ler histórico anterior mesmo se sair/reentrar no mesmo milissegundo. Chat/credits/recibos/outbox append-only. Privacidade é revalidada na leitura e na escrita; diretório só metadados públicos, convites recebidos só do ator, enviados e candidatos só líder/oficial, sem carteiras/runs/seeds alheios.

Vitória nativa na arena credita1XP à guilda se vínculo atual tiver24h. Fonte arena:matchUUID única por conta; defesa/derrota/replay e vínculo recente não creditam. XP vai somente à guilda, sem XP do personagem/Coin/Jade. Nenhuma fonte de XP informada pelo cliente. A arena retém seus limites próprios. XP de boss/guerra, bônus coletivos/semanais, ranking/pagamentos/arquivo de temporadas e guerra são integrações posteriores, dependentes de calendário/calibragem; não reutilizar grants ou bônus legados. Evolução desta etapa é funcional com XP de arena adquirido.

## Persistência, locks e recuperação

SQL011 cria mundo/revisão/cursor, guildas, membros, convites, chat/limites, créditos, recibos e outbox próprios. Guildas reais/legadas permanecem intactas. Flags V13 off por padrão; banco isolado, local/LAN, fora de production, monetizaçãooff; não há pin ou roster novo. Após build/migrações usuais do mesmo ambiente admitido V13, abrir o painel; não existe autoinscrição em guilda ou concessão por GET.

GET state inclui guilds em transação REPEATABLE READ READ ONLY. POST /api/v1/test-v2/guilds aceita estritamente {commandId,expectedRevision,guildRevision,action}; ações create/invite/accept/decline/revoke/leave/role/emblem/upgrade/chat. Ator/run derivam da sessão; custo, XP, alvo administrativo, guilda própria e tempo são verificados pelo servidor. CSRF/origem/rate limit herdados. Rejeição422 persistida, conflitoUUID409; falha inesperada reverte tudo.

Ordem: advisoryguild41652016 → mundo → runs canônicos ordenados → reautorização/membros. Arena passa a obter o mesmo advisory antes de arena41652015/runs, permitindo créditoXP atômico com match e sem corrida com saída/troca de guilda. Guilda nunca adquire lock de arena/evento/mercado depois dos runs. Mercado/evento/economia não adquirem advisoryguild, evitando ciclo de espera. Relógio pós-lock com piso no cursor persistido; acesso revogado bloqueia inclusive replay após espera.

Só criação/evolução liquidam R7 devido antes de gastar:1000eventos, backlog confirma parcela nativa sem executar operação. Evento ativo bloqueia gasto. Gestão/chat não avançam tempo nem criam farm. Todos os comandos novos incrementam revisão do ator; aplicados incrementam revisão global de guildas, créditos de arena também. Coin/ledger/run/guilda/membros/revisão/recibo/outbox transacionais, sem estado otimista.

Revisão da interface congela ação, alvo e revisões. SessionStorage por conta salva UUID/payload antes do envio; resposta perdida/recarga reenvia o mesmo recibo. Stale/settling encerra intenção e exige nova revisão; não recria compra/evolução/transferência automaticamente. Mercado/arena/guilda/economia bloqueiam novas mutações enquanto há resultado pendente, mantendo recuperação manual disponível. Texto externo usa textContent.

## Limites

Não certifica equilíbrio de progressão de guilda, concentração, população/retensão, temporadas ou infraestrutura pública. +16–20/economia real/monetizaçãooff; activationReady=false. Export próprio @akai/shared/guilds-v16 não altera módulos/entrypoint ou artefatos certificados V10/V11/V12. Evidências em [RESULTS.md](RESULTS.md).
