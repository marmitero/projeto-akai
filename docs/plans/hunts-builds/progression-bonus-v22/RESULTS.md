# V22 — resultado da recalibração experimental

Sete campanhas sintéticas independentes de 120 dias concluídas, comparadas às mesmas referências nativas V10. Três seeds, três builds, três rotinas; controlador, combate, compras, loot, refino e offline preservados. Não é população acoplada, vínculo social adquirido ou playtest humano.

**Integridade aprovada; candidata não aprovada para integração.** Não regressão em 6/7 casos; benefício primário experimental mínimo 1% em 2/7. Não alterar o critério após observar resultados. RuntimeEnabled/balanceApproved/activationReady=false.

| Rotina / build / seed | Máximo: referência → V22 (dias observados) | Torre1000: referência → V22 (dias observados) | Não regressão |
| --- | --- | --- | --- |
| best / swift / 1 | 106,9167 → 106,6076 | 104,9514 → 104,1181 | Passou |
| best / swift / 4213 | 106,8854 → 106,5174 | 105,9619 → 104,8264 | Passou |
| best / swift / 3735928559 | 106,5764 → 106,6319 | 104,6493 → 105,4029 | Falhou |
| regular / swift / 4213 | 108,0000 → 107,4236 | 109,5139 → 108,0035 | Passou |
| casual / swift / 4213 | censurado → censurado | censurado → censurado | Passou |
| best / balanced / 4213 | 111,3715 → 109,5764 | 116,4167 → 116,3090 | Passou |
| best / brute / 4213 | 111,4896 → 110,0590 | censurado → 113,7986 | Passou |

Casual terminou no nível 732/andar 746, ante 731/741, com ganho de domínio de 0,3488%; continua censurado para máximo/torre1000. Online 00h–02h Brasília e offline 02h–10h: esta rotina não recebeu evento global. Best é 24h; regular é 00h–16h mais 8h offline. Guilda rank 1 hipotética desde o dia 8; evento diário 12h–18h somente online.

Regressão retida: swift/seed 3735928559 demorou mais para o máximo e a torre1000. Balanced e brute melhoraram o prazo ao máximo em 1,61% e 1,28%, mas esses casos não compensam a reprovação do painel. O máximo de todas as campanhas concluídas respeitou o piso 96 dias qualificados.

Validação local: 2.007 diagnósticos pareados (1.964 vitórias/43 não vitórias), zero bônus igual ao crédito/carry nativos; 10 testes de domínio V22 e 4 testes Node de métricas passaram. Dois controles sem bônus reproduziram exatamente 8 dias diários completos por rotina. Auditoria longitudinal verificou os sete snapshots completos, fontes, equipamentos/stats diários, tempo exclusivo, contas de recursos e censura; geração e --verify passaram. Um teste local com seis adulterações e remoção de arquivo rejeitou todas as corrupções. A auditoria é de integridade, não prova independente de replay.

O diagnóstico V21 confirmou mudança de trajetória: primeira desvantagem de domínio nos dias 24 (casual) e 37 (best). Combate/loot/refino compartilham RNG; as transições externas de 3 s não creditam domínio. Esses mecanismos impedem inferir benefício longitudinal apenas da monotonicidade por encontro, mas sua contribuição causal ainda precisa de telemetria específica.

Código publicado na PR30 em 21f07e493164a445f36b42d531dfb25927807a84; Windows/LAN aprovado no mesmo SHA. CI completa [40031972102](https://github.com/marmitero/projeto-akai/actions/runs/40031972102) aprovada no mesmo checkpoint: 431 testes em 49 arquivos, PostgreSQL 16, sem skips, auditorias e regressões de navegador dev/preview. A CI não reexecutou as sete campanhas de 120 dias; estas foram auditadas localmente.

Próximo: instrumentar perdas de tempo qualificado, transições, atividade/material e mudanças de compras/RNG; ampliar seeds e janelas de atividade, incluindo o caso negativo fixado como regressão. Uma nova candidata deve ter critérios prévios e passar pelo painel inteiro antes de integração autoritativa no ensaio. Depois, coortes sociais/PvP e playtest gratuito; economia real/+16–20/monetização off.

Somente resumo de testes/conclusões, sem saldos, séries diárias ou snapshots. Dados completos locais ignorados.
