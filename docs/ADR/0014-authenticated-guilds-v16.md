# ADR-014 — Guildas autenticadas no ensaio v2

22/10/2026. Aceita sob a autorização de prosseguir para guildas e autonomia técnica da etapa. Evidências em [V16](../plans/hunts-builds/authenticated-guilds-v16/RESULTS.md).

Contexto: V13 fixa conta/run/eventos; V14 usa a carteira canônica, V15 resolve PvP. A comunidade legada usa outro domínio econômico. Importar suas guildas, saldos, XP ou bônus agora produziria uma transição silenciosa e invalidaria o isolamento do ensaio.

Decisão: guildas próprias na SQL011, vinculadas apenas a contas admitidas V13. Gestão completa de membros/cargos/convites, custos preservados500Coin e1000×nível, níveis/capacidade, brasão com paleta fixa e chat privado. Evolução usa XP acumulado nativo; arena credita1XP por vitória após24h no vínculo, única por match/conta e atômica com duelo. Não credita recursos ao jogador. XP de boss/guerra e bônus/ranking/arquivo/prêmios sazonais serão integrados com calendário e calibragem da etapa seguinte, sem importar fontes legadas. Transferência de guildas reais no corte continua pendente de autorização e reconciliação.

Advisoryguild41652016 é adquirido antes do advisoryarena41652015/runs; guildas não adquirem lock de arena/mercado/evento após runs. Assim uma saída/troca de vínculo não corre com crédito PvP. R7 limitado antes de gastos, sem liquidar batalha em ações de chat/gestão. Reautorização após locks antes de replay. Custos/ledger/recibos/outbox/membros transacionais; históricos append-only. UI congela ação/revisões e recupera mesma intenção persistida.

Alternativas: reaproveitar as tabelas legadas misturaria economias e bônus; manter apenas cadastro sem fonte nativa de XP deixaria evolução inoperante. Reutilizar o boss/wars/bônus legados alteraria regras da campanha sem validar acoplamento. Uma fonte PvP explícita permite evolução e teste desta etapa preservando o núcleo econômico adquirido. Export @akai/shared/guilds-v16 mantém entrypoint/módulos da campanha intactos.

Chat usa cursor máximo de mensagem no ingresso, além da vinculação atual: saída/reentrada no mesmo timestamp não revela histórico anterior. TextContent, bloqueios e silenciamento existentes são respeitados. Relatos/remoção individual deste chat e retenção pública exigem futura operação/moderação; não se anuncia ambiente público moderado.

Consequências: gestão e evolução funcionais no ensaio1–20; capacidade nominal20–38 não aprova população maior. Não há guild bank, Jade negociável, bônus econômicos, prêmios ou servidor público. Guildas reais não são migradas nesta fase, e XP sintético de fixtures não certifica progressão adquirida. Economia real/+16–20/monetizaçãooff; próxima etapa temporadas e integrações pendentes.
