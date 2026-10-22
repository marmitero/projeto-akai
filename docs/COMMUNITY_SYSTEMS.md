# Comunidade — regras e operação F6

Versão `community-1`, parâmetros experimentais de desenvolvimento. Mantém `local-rpg-1` e save local schema3: não importa saves locais e não cria jogadores fictícios. Mercado, pagamentos e publicação pública continuam fora desta fase.

## Acesso e interface

Modo online → **Mais → Comunidade**. Áreas: Chat, Guilda, Arena, Eventos e Rankings. O domínio de torre/minas continua independente da tela. Apelido de3–24 caracteres (letras, números, espaço, _ e -), único sem distinguir maiúsculas conforme collation do banco. UUID público identifica o jogador para convites; nunca é credencial de sessão/recuperação. Modo local/jogar.bat explica que comunidade depende de servidor, sem simular contas ou adversários.

GET /api/v1/community fornece estado confirmado; POST /api/v1/community/commands recebe commandId UUID e action, sem dano, vencedor, horário ou saldo. Schemas em packages/shared/src/community.ts. Mesma identidade/cookie/Origin/header anti-CSRF da F5. Um comando pendente por cliente, sem efeito otimista; retry preserva envelope/UUID. Mesmo UUID alterado gera409; rejeições também persistem. Todas as operações sociais são serializadas por lock transacional PostgreSQL41652006 antes dos locks de contas. Isso simplifica concorrência nesta primeira implementação; não é arquitetura de escala ilimitada.

Limites de piloto:5.000 perfis de comunidade,200 contas inscritas por edição de boss,50 mensagens retornadas por canal,20linhas por ranking,100guildas no diretório e60comandos sociais/minuto/sessão. Poll social a cada2s apenas com a comunidade aberta e documento visível; snapshot online da F5 continua1s. Não adicionar polling a cada frame.

## Chat e moderação

Chat global após vencer andar1; guilda exige vínculo atual. Texto simples1–500caracteres, sem controles ASCII e intervalo3s compartilhado pelos canais. Não interpretar HTML/Markdown de usuários: renderização com textContent. Brasão do vínculo atual acompanha o apelido no chat. Chat de guilda visível apenas a membros atuais e somente a partir da entrada atual; sair/reentrar não revela histórico anterior.

Bloqueio é individual, oculta mensagens do autor ao bloqueador e pode ser revertido por UUID. Não altera arena/rankings. Denúncia exige mensagem visível no canal autorizado e motivo3–300caracteres; uma denúncia por conta/mensagem, sem múltiplas contagens por retry. Silenciamento impede envio até a data configurada, sem apagar automaticamente histórico. Remoção de mensagem e suspensão são atos de operador com trilha de motivo/ator/data. Suspenso não usa APIs autenticadas e sai dos rankings/seleções ativos; suspensão não apaga auditoria ou saldo.

Não existe endpoint público de administrador nem permissão obtida por campo do cliente. CLI exige acesso ao ambiente e credencial do banco:

```bash
npm run community:admin -w @akai/server -- operador mute UUID "Motivo de moderacao"
npm run community:admin -w @akai/server -- operador unmute UUID "Revisao concluida"
npm run community:admin -w @akai/server -- operador suspend UUID "Investigacao de abuso"
npm run community:admin -w @akai/server -- operador restore UUID "Analise concluida"
npm run community:admin -w @akai/server -- operador remove-message ID_NUMERICO "Conteudo removido"
npm run community:admin -w @akai/server -- operador resolve-report UUID_DENUNCIA "Analise concluida"
```

Mute inicial24h; alterar duração exige mudança explícita/configuração revisada. CLI registra ação mesmo quando a seleção não encontra linha: operador deve conferir o alvo e resultado no banco. Suspensão revoga sessões; após restauração, entrar novamente por recuperação/Google. Não há moderação humana contratada, filtro linguístico completo ou política pública aprovada nesta entrega. Preparar responsáveis, denúncia/recurso, retenção e atendimento antes de abrir o serviço.

## Guildas e brasões

| Ação | Regras instaladas |
|---|---|
| Criar | Sem guilda, andar5 concluído,500Coins da conta criadora |
| Capacidade |20+2×(nível−1),nível1–10, máximo38 |
| Evoluir | Líder; XP acumulado>=100×nível atual; custo1000×nível atual Coins; XP acumulado não é consumido |
| Convidar | Líder/oficial; conta com perfil de comunidade, não suspensa e sem guilda; validade24h |
| Aceitar | Convite válido, sem outro vínculo, vaga validada sob lock; aceite remove outros convites da conta |
| Cargos | Líder promove/rebaixa/remove/transfere; oficial só convida e remove membros; membro não administra |
| Sair | Livre para membro/oficial; líder transfere antes, ou encerra guilda se for o último membro |
| Brasão | Líder; grade16×16,256índices0–7 de paleta fixa; sem upload/SVG/imagem arbitrária |

XP da guilda:1por vitória PvP de membro com24h de vínculo; max(1,floor(dano/100)) por contribuição de boss, se o vínculo antecede o início;100ao vencer guerra. Esses pontos também contam no ranking da semana correspondente. Originais dos sprites não são modificados; brasão é conteúdo do usuário previsto no Master Prompt, exibido como grade HTML de pixels.

Bônus de XP por colocação da guilda na semana anterior:1º10%,2º7%,3º5%,4º–10º3%,demais pontuadas1%. Precisa de24h no vínculo atual. Validade termina no encerramento da semana seguinte; intervalos de combate são segmentados no início/fim dos bônus. Não carregar bônus indefinidamente após semanas sem servidor. Somado ao evento XP; não multiplica um bônus pelo outro.

## Arena

Andar5 concluído. Entradas reais recebem posição no ingresso à temporada, em ordem de registro de perfil e UUID para desempate. Oponentes são os até5elegíveis imediatamente acima, sem bots, excluindo suspensos. Se houver menos, mostrar apenas os existentes; primeiro colocado não recebe adversário falso.

Snapshot competitivo: heroStats do domínio compartilhado com tônico de ataque desativado; equipamentos, níveis e passivo do mascote permanecem. Vida máxima, nunca vida residual da torre. Defesa usa a mesma fórmula floor(ATQ×100/(100+DEF)),mínimo1. Cada segundo ambos atacam simultaneamente;120passos no máximo. Mortes simultâneas/timeout favorecem defesa. Não altera vida da torre nem envia dano pelo cliente.

Vitória troca as posições do atacante e defensor (sem deslocar outros jogadores), soma20troféus ao atacante; derrota mantém posição e subtrai10,mínimo0. O defensor não recebe penalidade de troféu por ser desafiado. Intervalo60s por atacante e máximo20desafios nas últimas24h, inclusive atravessando reset semanal. Comandos concorrentes revalidam a seleção e posição atuais; não confiar em lista antiga da UI. Match grava atributos, posições anteriores, passos, dano e motivo do resultado. Ordenação por posição e por troféus são independentes.

## Calendário e temporadas

Relógio exclusivo do servidor, calendários via Intl/`America/Sao_Paulo`; não hardcode UTC−3 como regra para todas as datas. Semana: segunda00h até segunda seguinte00h. Temporadas têm IDs por data da segunda, estado de fechamento e arquivo com arena/guildas/dano. Histórico não é apagado.

Reset cria nova entrada/posição/troféus e pontuação semanal, mantendo força, maior andar, saldo, guilda/nível/XP e arquivo. Rankings permanentes: força, maior andar, saldoCoin atual e histórico de últimos golpes. Sazonais: posição/troféus da arena, pontos de guilda e dano de boss.

Força única:10×ATQcompetitivo+HPmáximo+20×DEFcompetitiva. Saldos em unidade mínima BigInt, sem converter valores grandes para float ao ordenar Coins.

Fechamento: top3de troféus entre contas que participaram de ao menos um match na semana (ataque ou defesa) recebem500/300/100Coins. Membros com24h de vínculo em guildas top3pontuadas recebem300/200/100Coins. Cada fonte/conta recebe uma vez. Arquivo conserva resultados mesmo que o servidor feche a semana atrasado; o bônus da semana anterior tem expiração própria. Guildas vazias/inativas e suspensos não são premiados nas seleções ativas. Resultados e edições são testáveis em banco, com resumo de até8temporadas arquivadas na UI.

## Boss diário

22h–22h30 de Brasília; edição `boss:AAAA-MM-DD`,1.000.000HP experimental. Requer andar10concluído e conexão online; participação explícita. Dano automático por segundo com atributos competitivos do servidor. Sem enviar valor de dano. Presença exige lease da conta e renovação pelo painel aberto; queda abrupta autoriza até3s já reservados, nunca horas de dano offline. Sair explicitamente desativa renovação até novo ingresso.

Outros membros da mesma guilda simultaneamente presentes acrescentam1%de ataque cada, máximo20%; conta própria não conta, múltiplas sessões da mesma conta não contam duas vezes, vínculo precisa anteceder o início. Não é garantia de detecção de toda conta alternativa; requisitos/presença reduzem abuso e loteria exige Google único. Falhas/restarts retomam watermark de ataques; ordem de ticks por horário e UUID. Dano é limitado ao HP restante, último golpe fica único no registro da edição.

Recompensa por contribuição positiva ao encerrar (morte ou timeout):50+floor(dano/HPmáximo×1000)Coins, mais200/100/50aos3maiores; empate ordena por UUID. Último golpe recebe500Coins extras. Fontes de concessão são únicas e vão ao ledger/outbox atômicos. Lista de contribuições, HP, último golpe e recompensas aparecem na UI; ninguém pode reiniciar edição fechada por rota pública.

Debug de servidor de desenvolvimento: `AKAI_COMMUNITY_DEBUG=1`, NODE_ENV diferente de production e CLI de operador `start-boss current "Motivo"` podem antecipar somente a edição ainda agendada/sem inscritos do dia. Sem reabrir edição ativa/fechada e sem endpoint público. Perfil local/jogar.bat não fabrica um boss multiplayer; esse debug exige o servidor/banco de desenvolvimento.

## Eventos relâmpago

| Evento experimental | Horário e regra |
|---|---|
| XP global | Diariamente12h–18h; +30%XP de herói e rei em mortes online; somado ao bônus de guilda; sem XP de batalha offline |
| Loteria |18h;100Rubies para uma conta elegível, sorteio CSPRNG do servidor; sem elegíveis, encerra sem vencedor |
| Raid individual |20h–21h; andar10; uma tentativa/edição, combate automático com presença e prazo, baú ao vencer |

Loteria: perfil de comunidade, Google vinculado (subúnico), conta com10minutos, andar10concluído e intervalo de presença confirmado cobrindo o instante do sorteio. Sessão/conexão extra não cria outra entrada. Salva conjunto elegível e vencedor; restart não escolhe participantes que chegaram depois do horário. Registro do intervalo ocorre no caminho confiável de sessão. Expulsão/suspensão no fechamento remove elegibilidade. Rubies são recompensa virtual prevista no prompt: não habilita compra, negociação ou conversão monetária.

Raid: snapshot de atributos competitivos ao entrar; boss com HP=max(100,20×maiorandar),ATQ=max(5,maiorandar+3),DEF5. Herói ataca primeiro por segundo, só há contra-ataque se o boss sobreviver; expiração/derrota não concedem baú nem retry na mesma edição. Vitória abre automaticamente um item de nívelceil(maiorandar/10),cap100; raridade incomum70%,rara25%,épica4,5%,lendária0,5%,atributos CSPRNG. Mochila120peças cheia converte em10×nível ferro. Roll/instância persistidos, sem novo sorteio após recarga. Não usa HP da torre nem cura a torre.

Janela/estado/bônus/recompensa e transições aparecem no painel. Horários são escolhas técnicas de teste, sem obrigação de ficar conectado por períodos longos; prêmios não bloqueiam o progresso-base. Mudanças futuras exigem versão/configuração e simulação.

## Guerra semanal

Líder inscreve/atualiza antes de domingo18h. Precisa de dois membros não suspensos com24h na guilda. Inscrição congela roster e atributos confiáveis naquele momento; atualizar antes do limite recongela. Na abertura, remove quem já não pertence à guilda. Pareamento por nível decrescente e UUID; número ímpar deixa uma guilda sem confronto e sem prêmio fictício. Cada guilda disputa no máximo uma guerra/semana.

Domingo18h–19h, cada participante do roster faz um ataque. O alvo é o membro correspondente por índice, com módulo para times de tamanhos diferentes; não aceita alvo/dano/vencedor arbitrários. Duelo usa as regras da arena e os atributos registrados. Vitória vale3pontos; desempate pela soma da fração de HP adversário removida; igualdade total é empate. Depois19h, fecha uma vez: cada participante que atacou recebe500Coins se vencedor,250se empate,100se perdeu. Não há prêmio por simplesmente estar no roster. Guilda vencedora ganha100XP/pontos semanais. Não promete matchmaking competitivo final; balancear com playtest antes de público.

## Dados, migração e operação

Migração002 é aditiva e mantém contas/sessões/saldos/inventário da001. Rodar `npm run db:migrate -w @akai/server` antes de subir o servidor atualizado. Sem novos segredos/serviços contratados. Worker a cada2s e sincronização por leitura/comando usam o mesmo lock PostgreSQL; sem relógio do cliente, duplicação de scheduler ou jobs na aba. Grants, estado, ledger, outbox e marcador de concessão confirmam juntos; falhas SQL revertem tudo. Auditoria social e recompensas são append-only por trigger. `db:reconcile` continua comparando saldos com ledger, incluindo Rubies.

Estender permissões da role de runtime às tabelas sociais necessárias, sem DDL nem UPDATE/DELETE dos históricos. Moderador usa credencial operacional restrita; nunca a enviar ao cliente. Fechamentos e leitura de diretórios estão limitados ao piloto; lock global, consultas e volume precisam de teste de carga antes de serviço público. Definir retenção/limpeza da presença, chat, denúncias, sessões e backups; não apagar claims/idempotências sem política segura. Conferir schema002 no readiness/backup/restauração.

Gates externos continuam: configuração Google real, infraestruturaTLS/WSS/banco, equipe e política de moderação/privacidade, limites/retencão/alertas, escala e aparelho físico, licenças dos assets e playtest humano de economia. Nenhum desses é presumido concluído por testes locais.

## Ensaio autenticado V15

A seção Arena acima descreve o domínio legado. A arena do ensaio V13 usa os mesmos personagens/equipamentos v2 já admitidos, com fórmulas v3 e intervalo real da build, ataques simultâneos, vida cheia e limite120s. Mantém andar5, cinco alvos acima, troca de posições/+20troféus, derrota−10mínimozero,60s/20por24h e desempate da defesa. Ranking semanal e histórico próprios; sem Coin/XP/Jade ou pontuação/prêmios de guilda/temporada nesta fase. Não aplica bônus legados ao personagem v2. GET é somente leitura; inscrição semanal e desafios exigem revisão/confirmação. [Contrato, recuperação e operação V15](plans/hunts-builds/authenticated-arena-v15/IMPLEMENTATION.md). Guildas/temporadas v2 e calibragem competitiva permanecem próximas etapas; flags de teste e ativação econômica off por padrão.

## Guildas do ensaio autenticado V16

Painel Mais→Ensaio online v2→Guildas online v2 de teste: criação/evolução pela carteira v2, convites/recusa/revogação, cargos/transferência/remoção/saída/encerramento e brasão fixo. Chat literal restrito à entrada atual usa cursor de mensagem para não vazar histórico em reentrada no mesmo ms; bloqueios e mute da conta respeitados. Fonte atual1XP por vitória nativa de arena após24h, única por match/conta; sem walletgrants. Bônus/XP de boss/guerra e temporadas não são importados do legado. Operação/moderação/retensão públicas permanecem gates. [Contrato V16](plans/hunts-builds/authenticated-guilds-v16/IMPLEMENTATION.md) e [ADR-014](ADR/0014-authenticated-guilds-v16.md).

## Temporadas v2 V17 — ensaio autenticado

Calendário de Brasília, acompanhamento explícito sem retroatividade, arquivo imutável e fechamento confirmado no painel Temporadas. Prêmios nativos Coin arena500/300/100entre participantes de duelo e guildas300/200/100por membro com24h na fronteira; critérios/locks/recuperação em [V17](plans/hunts-builds/authenticated-seasons-v17/IMPLEMENTATION.md). Após a fronteira, arena/gestão de guilda aguardam fechamento; recibos prévios continuam recuperáveis. O arquivo mantém rankings ativos selecionados, nomes congelados e intervalo efetivamente acompanhado. Histórico de dano de boss/guerra/bônus de progressão continuam próximos passos; regras legadas acima não são automaticamente aplicadas ao domínio por tempo v2.

## Boss/guildas/arquivo V18 — ensaio v2

Arquivo diário durável antes do resetR8, com dano efetivo/contribuição/participação separados e fonte própria de XP da guilda. Regra candidata boss-guild-v18-1: max(1,floor(dano efetivo novo×100/HP)), zero sem dano, teto100porconta/edição; vínculo deve anteceder o dia e permanecer até fechar. Baseline impede XP retroativo e dano pós-morte não pontua. Não importar a fórmula legada dano/100 nem o bônus de ataque coletivo. Fechar boss pendente antes de gerir guilda/encerrar semana; pontos datam endMs−1. Ranking semanal soma edições fechadas no intervalo, sem prêmio adicional. Jade e domínio permanecem nas regras nativas. [Contrato/limites V18](plans/hunts-builds/boss-archive-v18/IMPLEMENTATION.md).
