# Fase 3 — população do boss e Jade (V12)

Simulação privada com o motor R8 e atributos efetivamente registrados nas campanhas V10. Os valores definidos pelo usuário permanecem: participação 3 Jade, top10 de 200 a 20, último hit 250 com broadcast. Economia real, +16–20 e monetização continuam desativados.

## Protocolo

1. Conferir SHA256 dos sete arquivos certificados da V10. Usar snapshots observados do primeiro dia elegível (andar100), dias10/30/120. São arquétipos reaproveitados para simular população, não20novas campanhas nem20contas reais já conquistadas. Não reconstruir inventário/carteira a partir de um resumo de atributos.
2. Rodar combate nativo com1/7/20participantes e três seeds; iniciantes, avançados, chegada escalonada, lease expirada, saída/retorno. Duração900/1300s. Todos os danos e segundos qualificados são calculados pelo R8; sem atribuir contribuição por simples presença. Heartbeat a cada10s, sem preencher ausência. O evento é a atividade exclusiva do intervalo: não creditar farm, XP, Coin ou offline paralelos.
3. Conferir dano coletivo+HP restante=maxHP, corte de overkill, chaves únicas de recompensa, um único último hit/broadcast, valores por faixa e participação somente após600s válidos. Comparar orçamentos de processamento e JSON resume.
4. Separar tempo de qualificação da base do instante de pagamento competitivo. Contrato atual permite ranking/último hit antes de600s; não impor uma regra nova silenciosamente.
5. Avaliar concentração por conta e por dono hipotético. O agrupamento de10contas avançadas sob um dono é hipótese de coalizão, não detector de identidade nem aquisição gratuita de contas; cada conta precisa ter progredido e ser operada. Não usar IP/dispositivo como prova de dono.
6. Testar chegada tardia em seis instantes próximos da morte de referência. Usa conhecimento posterior de uma simulação determinística: sensibilidade adversarial, não taxa prática de sucesso. Preservar todos os resultados, inclusive tentativas sem último hit.
7. Comparar três HPs hipotéticos com o grupo avançado de20participantes. São cópias explicitamente parametrizadas, sem alteração do HP100milhões no runtime. Não concluir dificuldade global/capacidade a partir de20atores.
8. Para100/1000/5000contas, apresentar somente tetos aritméticos de emissão:3por elegível, mais uma escada1100 e um último hit250 por edição global derrotada. Contrapor a repetição de prêmios em coortes independentes de20. Não confundir divisão de processamento com multiplicação do prêmio global.
9. Confrontar Jade com o custo matemático do+16–20 protegido usando um lendário+15 realmente adquirido na V10. A cadeia de regressão usa as cotações existentes, com outros recursos ilimitados, sem chamar o executor bloqueado. Custo esperado/renda não é previsão de data/P95 de conclusão. Não prometer453Jade diários para cada jogador.

## Reprodução e limites

`npm run test:population` · `npm run audit:population`. A segunda ordem reproduz o relatório integral e exige igualdade exata de resultados/fontes. `results.json` preserva perfis/origens, dano, tempo, prêmios, concentração, cenários incompletos, tentativas tardias e projeções. CI também verifica V10 e V11 originais. O orçamento da CI sobe de20para25min para acomodar a auditoria nova sem remover checks existentes.

Este script usa apenas funções públicas puras compartilhadas. O adaptador PostgreSQL ainda é privado e limitado a20runs; a simulação não entrega autorização pública, coordenação global de shards, detecção de contas alternativas, migração ou capacidade de produção. Regras/recompensas/curvas do runtime permanecem idênticas, preservando os fingerprints V10/V11.

Estado: ensaio executado; fechamento e decisões em RESULTS.md. Integridade técnica não aprova automaticamente população pública, fonte/consumo de Jade ou ativação.
