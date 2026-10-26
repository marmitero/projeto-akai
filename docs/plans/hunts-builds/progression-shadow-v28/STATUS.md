# H28 — checkpoint de continuidade: auditoria final pendente

Código do experimento congelado em0912cf1c46e6fd41846cecee4d8295efbb4199ec. Este checkpoint registra progresso confirmado; não aprova nem declara concluído o estudo H28.

## Confirmado

-14controles nativos encerraram com exit0 após120dias cada:1.680dias-conta.
-Todos reproduziram120linhas diárias, estado semântico final e trace/digests arquivados.
-Banco zero conferiu crédito/carry em cada vitória. Foram gerados1.680ledgers diários privados, com2.779.683vitórias.
-Sete testes H28 e ensaio curto do runner passaram. CI completa do código0912cf1c aprovada: [PR40318155128](https://github.com/marmitero/projeto-akai/actions/runs/40318155128) e [push40318148517](https://github.com/marmitero/projeto-akai/actions/runs/40318148517),431testes/49arquivos, sete novos testes Node H28 e Windows/LAN.

## Pendente e bloqueio

Duas recomputações completas dos bancos a partir dos ledgers estavam em execução na última consulta. A primeira deveria gerar local/summary.json; a segunda, /tmp/v28-independent-summary.json. Não foi possível confirmar seus resultados, compará-los ou executar o teste privado final de adulteração: o ambiente ficou indisponível e a ferramenta retornou “No usable execution environment is available”.

Os resultados de benefício sombra/oráculo ainda não foram validados nem publicados. Não usar rascunhos ou relatórios parciais para aprovar H28. O checkpoint não contém ledgers, estados, saldos ou séries diárias.

## Retomada

1. Restabelecido o ambiente, conferir os processos/sumários e logs antes de iniciar novas cópias. Todas as14campanhas nativas já haviam terminado; não iniciar duplicatas.
2. Arquivos esperados em docs/plans/hunts-builds/progression-shadow-v28/local/; metadados em execution-sessions.json. Logs de auditoria: /tmp/v28-audit.log e /tmp/v28-recheck.log. As sessões das recomputações eram97511 e1749; o estado posterior não foi consultável.
3. Se os dois relatórios estiverem completos, comparar integralmente os objetos JSON. Cada recomputação precisa ter reexecutado todos os bancos de cada ledger, com os mesmos hashes/fontes compiladas. A comparação deve acontecer após ambas terminarem.
4. Confirmar a repetição da auditoria; a opção --verify oferece a mesma recomputação e comparação de forma sequencial. Executar node --test scripts/tests/progression-shadow-v28.local-check.mjs depois da validação íntegra. Essa etapa ainda não passou.
5. Só então registrar conclusões/endpoints sanitizados e publicar a conclusão. Não alterar fonte, modelo compilado, protocolo, critérios ou negativos para fazer o resultado passar. Preservar o H28.md original em progression-envelope-v27, vinculado por hash.

O banco sombra não alimenta combate, stats, compras, decisões ou RNG nativos. Igualdade de torre é por construção e não aprova o gate adaptativo. H26 e V22 permanecem reprovadas; nenhuma mudança de taxa foi feita.

runtimeEnabled=false; balanceApproved=false; activationReady=false. PR30rascunho, sem merge/ativação. Economia real/+16–20/monetizaçãooff.
