# ADR-016 — Arquivo diário e XP de guilda do boss v2

22/10/2026. Aceita no escopo de próximos passos e autonomia técnica. [Contrato V18](../plans/hunts-builds/boss-archive-v18/IMPLEMENTATION.md).

O motor R8 troca a edição no fim do dia e não mantém arquivo diário. V16 possui XP de arena e V17 fecha semana com fontes datadas; inserir XP de um boss antigo depois do arquivo semanal perderia seus pontos sazonais. A fórmula legada dano/100 produziria1milhão de XP com o HP nativo100milhões, sem equivalência à escala das guildas atuais.

Decisão: adapter canônico intercepta a substituição da edição, preservando janelas nativas inteiras/leases e máximo30porcomando. Arquivo e fontes são append-only na mesma transação R8 de carteiras/grants/recibo/outbox. Nenhuma alteração do motor root, Jade, HP ou tempo. Dias inativos não produzem arquivos fictícios; arquivos de contribuições existentes podem ser preservados sem XP retroativo.

Capturar vínculo/ingresso e baseline de dano na primeira entrada autenticada. Só vínculo anterior ao início civil real da edição e ainda idêntico/ativo no fechamento recebe XP, com conta disponível. Reentrada não recaptura elegibilidade e troca de guilda não transfere contribuição. Fonte única realm/data/conta; XP=max(1,floor(dano efetivo novo×100/HP)), zero sem dano, máximo100porconta. Dano pós-morte não entra. Versão boss-guild-v18-1, candidata limitada, testada nos17cenários adquiridosV12 como contrafactual de vínculos estáveis, sem certificar playtest/balanceamento.

Advisoryguild antes de realm/runs em todo comando R8; privados não canônicos mantêm motor anterior sem arquivo/fonte nova. Sessão revalidada após locks e antes de replay. Clock de comandos canônicos participa do cursor persistido de guildas/temporadas. Guildas e fechamento semanal aguardam o boss vencido, com BOSS_CLOSE_REQUIRED, e crédito usa endMs−1. Assim domingo pertence à semana encerrada mesmo com processamento tardio. A temporada soma dano efetivo de edições fechadas no intervalo acompanhado, sem novo prêmio.

Alternativas: arquivar após advance perderia o snapshot já substituído; dividir o último ms poderia alterar o instante de um grant de qualificação. Modificar o núcleo certificado invalidaria seus artefatos adquiridos. Fechar no GET quebraria leitura pura e confirmação de comando. Um scheduler público adicionaria operação/infraestrutura fora do ensaio. O adapter compartilha a transação existente e expõe o processamento explícito já disponível.

Consequências: histórico diário e fonte nativa de guilda no ensaio, com guarda de calendário e ranking semanal de dano. Receipts/rollback e regras Jade intactos. Bônus de domínio, guerra autenticada, guildas reais, retenção/moderação/capacidade pública e playtest adquirido continuam próximos passos/gates. Economia real,+16–20/monetizaçãooff. Sem decisão financeira ou serviço público novo.
