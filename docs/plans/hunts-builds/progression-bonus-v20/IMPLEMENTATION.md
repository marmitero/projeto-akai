# V20 — definição e calibração de bônus de progressão

Laboratório isolado, sem ativação ou consumo no jogo/ensaio autenticado. Não adiciona migração, endpoint, concessão, parâmetro de cliente ou novo campo a personagens/carteiras. Export próprio progression-bonus-v20 fornece somente cotações; runtimeEnabled/activationReadyfalse. Não confundir modelo validado com bônus aplicado ao jogo.

## Regra candidata

Substituir multiplicador de XP legado por redução limitada da penalidade de referência. Seja Q o tempo qualificado de uma vitória nativa completa, B(L) o benchmark nativo, r a referência do encontro e L o nível atual:

- taxa-base=min(r²,L²)/L² × min(Q,B(L))/Q;
- taxa-candidata=min(1,min(r²,L²)/L² × (1+b)) × min(Q,B(L))/Q.

Integração recalcula nível/benchmark a cada fronteira e mantém carry micro-ms. Em qualquer trecho a taxa é no máximo1 e não supera o benchmark. Nenhum bônus por derrota, timeout, pausa, deslocamento não qualificado, ausência fora da quota, boss/evento social ou tempo inexistente. As duas transições nativas de3s dentro de uma vitória comum continuam como noR6; não há nova inclusão de caminhada. Sem Coin/material/loot/Jade/proteção gratuitos, desconto, atributo ou alteração de combate. Um encontro já eficiente pode receber zero ganho adicional.

| Fonte futura | Taxa nominal |
|---|---|
| Guilda 1ª/2ª/3ª da semana anterior |10%/7%/5% |
| Guilda 4ª–10ª / demais pontuadas |3%/1% |
| Evento diário12h–18h Brasília, somente online |30% |
| Soma máxima, sem multiplicar fontes |40% |

Guilda requer24h na fronteira anterior, mesma guilda e mesmo vínculo durante uso, resultado nativo arquivado, guilda ativa e conta admitida/disponível. Futuro entitlement deve ser imutável e derivado do fechamento, nunca rank enviado pelo cliente. Disponibilidade=max(início da semana seguinte,commit do fechamento), expiração no fim dessa semana, calculados em America/Sao_Paulo. Fechar atrasado não paga retroativamente e não prorroga bônus vencido. Reentrada/troca não herda fonte anterior. Global e guilda somam; offline pode ter só guilda, sob quota/build congelada e segmentação de início/fim, nunca evento global. quoteMasterySegmentsV20 segmenta uma vitória nos horários canônicos, sem reaplicar ao combate inteiro na coleta. Trechos adjacentes idênticos são coalescidos para preservar precisão/carry e não deixar a divisão de requisições mudar a cotação.

## Evidência e limites

2.007encontros pareados em sete campanhas V10 adquiridas, seis dias observados e três seeds de diagnóstico, torre/hunts/fronteira:1.964vitórias e43não vitórias preservadas. Zero bônus reproduziu exatamente crédito/carry nativos de todas as vitórias. O laboratório apenas acrescenta exports a uma cópia temporária do módulo compilado, sem alterar funções nativas ou fontes adquiridas. SHA dos sete arquivos e da fonte são verificados; detalhes regeneráveis em paired-encounters.json.gz (arquivo derivado não versionado), resumo e hash de todos os casos em calibration-results.json. A CI recalcula todos os casos e compara o hash, sem depender desse arquivo derivado. Carry inicial0 é convenção de diagnóstico, não carry diário adquirido.

Ganho agregado ponderado pelo crédito:10%nominal→4,48%efetivo,30%→12,19%,40%→15,68%. Não é ganho médio populacional nem redução medida do prazo de uma campanha.9testes de domínio incluem piso96dias, carry, grade de fronteiras/taxas, benchmark, input inválido, vínculo/expiração/fechamento tardio, soma e offline, segmentação. A fórmula não concede qualquer recurso nem altera os snapshots.

Integridade matemática/local aprovada; balanceApprovedfalse. Ranking/vínculo e sobreposição permanente são contrafactuais. Campanhas completas com comportamento de compras/drops/nível alterado, fontes sociais adquiridas, calendário/offline persistidos e playtest humano continuam necessários. Próxima etapa: validação longitudinal contrafactual antes de qualquer integração autoritativa ou ativação. O laboratório V21 de campanhas tem versão/proveniência própria, snapshots separados e nenhuma alteração de conta real.

Reproduzir: npm run build:shared; node scripts/economy-v2/audit-progression-bonus-v20.mjs --verify. Economia real,+16–20/monetizaçãooff. Nenhuma decisão obrigatória do usuário nesta etapa técnica.
