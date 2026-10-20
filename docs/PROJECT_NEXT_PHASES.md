# Próximas fases — sequência recomendada

Esta ordem parte do jogo publicado e da calibração econômica em branch. Publicar o resultado de cada etapa, preservar versões e usar revert para rollback. Monetização permanece na fase final; não reabrir tarefas concluídas sem evidência nova.

| Ordem | Fase | Entrega / condição para avançar |
|---:|---|---|
|1|Playtest Android e polimentos finais da interface|Testar `celular.bat` no aparelho real: retrato/paisagem, teclado, HUD, toque, retorno do segundo plano e fluidez. Ajustar os problemas encontrados. P8 Global embutido concluído nesta etapa; continuar apenas com ajustes encontrados no aparelho.|
|2|Fechar contratos da nova economia|Contratos fechados em [ECONOMY_RULES](plans/hunts-builds/contracts/ECONOMY_RULES.md): jade/proteção/mercado/aposentadorias/legado. Próximo: validar as entradas alteradas no modelo acoplado e ensaiar R2 desativada; sem aprovação automática de ativação.|
|3|R2 — Contratos e ensaio de migração|Contratos e ensaio read-only implementados em [R2](plans/hunts-builds/r2/IMPLEMENTATION.md):XPinteiro,arquivo/projeção/restauração,escrow/dívida. Falta ensaio em cópia representativa e ferramenta de corte transacional; nenhuma conta migrada.|
|4|R3 — Combate e builds|Força/VIT/AGI/DefF/DefM/Sorte/Destreza; acerto→crítico→mitigação→dano. Orçamento de pontos, velocidade gradual até5APS extremo, inimigos mágicos e efeitos reais em cada modo suportado. Validar FPS/delta/reconexão equivalentes.|
|5|R4 — Hunts e repetição|Carvão/ferro/ouro com progresso e visual próprios, inimigos entrando na arena, dificuldade crescente e farm de andares não boss já vencidos. Principal geraCoin/XP/equipamentos; hunts sóXP+material. Uma atividade econômica por vez.|
|6|R5 — Equipamentos e fortalecimento|Drops renováveis, raridade/nível, receitas, probabilidades, manutenção/regressão/quebra, proteção gratuita e transação atômica. Preservar a instância no mercado/escrow e impedir reroll por retry. +20opcional de prestígio; +16–20não ativados antes da fonte definitiva de jade.|
|7|R6/R7 — Corte da economia e integração|Remover clique/minas como fontes junto da compensação, incluindo descarte e overflow que ainda dão ferro. Validar XP90–120dias no melhor cenário, progresso offline, agenda de combate, salvamento, performance, comunidade/PvP/rankings e mercado. Manter a nova economia atrás de ativação até as dependências estarem prontas.|
|8|R8 — Bosses, raids e jade|Etapa dedicada: rebalancear bosses da torre e desenhar encontros avançados; boss global diário como fonte exclusiva de jade:base3,rankingtop10de200a20,último golpe250,cumulativos e broadcast, conforme revisão20/10/2026. Plano de cálculo/consumidor prontos emR2; integrar entrega atômica e validar concentração. Revalidar o conjunto antes de liberar o high-end. Não confundir o orçamento de poder simulado de uma hunt com uma raid pronta.|
|9|Playtest consolidado / beta|Campanha completa com contas novas e legadas, contas sem compra, mercado finito, longas sessões, Android real e testes de concorrência/recuperação. Revisar caudas de refino e duração por perfil; corrigir as falhas antes da liberação.|
|10|Distribuição mobile|Depois da interface estável, PWA emHTTPS com manifest/ícones e política de atualização/cache. Avaliar APK apenas se houver necessidade concreta de distribuição ou integração nativa. Hospedagem e infraestrutura externa exigem decisão própria; não estão abertas por esta etapaLAN.|
|11|R9 — Monetização na fase final|Oferta total de proteção gratuita/paga, preçosRuby, limites e efeito no mercado; integrações GooglePlay/AdMob e validações externas pendentes. Só ativar após balanceamento/playtest, revisão comercial e mecanismos de compra/estorno/restauração prontos.|

R6/R7 podem ser preparados antes dos bosses, mas a ativação integral do novo high-end depende da fase8. Não publicar fontes de jade provisórias nem bônus de loja que contornem o piso temporal. A fase11 é a última de implementação comercial; correções e manutenção continuam depois.

## Estado da calibração

A [R1.1 publicada](https://github.com/marmitero/projeto-akai/blob/validate/economy-r11/docs/plans/hunts-builds/r11/CALIBRATION_REPORT.md) passou gates numéricos: mediana109dias no melhor perfil e107dias no holdout; piso96dias; +20em1,67%da coorte madura gratuita/90dias. A aprovação integral segue bloqueada pelas entradas materiais listadas na fase2. Esses números ainda não estão ativos no jogo.

O cenário otimizado pressupõe até24horas econômicas por dia, sem somar farm simultâneo. Com2honline+8hoffline, o modelo mediu299dias. Se a intenção passar a ser90–120dias também para jogadores pouco conectados, revisar primeiro a política de farm offline/servidor, sem esconder essa mudança sob bônus de compra.

Revisão20/10/2026:novo orçamento de jade invalida a antiga evidência de raridade+20. Não tratar os1,67%históricos como aprovação da oferta competitiva; nova sensibilidade por população/concentração emR2/audit-results.json. Meta deXP90–120dias no melhor cenário mantida.
