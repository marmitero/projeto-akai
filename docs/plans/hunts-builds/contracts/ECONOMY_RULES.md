# Fechamento de regras — economia v2

19/10/2026. Contrato de design **economy-v2-contract-1**. Decisões desta etapa; não são regras já ativas no jogo. [Valores estruturados](economy-v2.json). Base numérica: [R1.1 candidata 3](https://github.com/marmitero/projeto-akai/blob/9033b6061bc619ff8bdb065a901fdfff1fcafe9c/docs/plans/hunts-builds/r11/CALIBRATION_REPORT.md). Essa revisão prevalece sobre hipóteses abertas da proposta inicial. A matemática detalhada permanece na branch de calibração; não se importou gameplay experimental para a main.

## 1. Tempo, conquistas e atividades

Nível máximo1000; equipamento até100. Piso de8.294.400segundos qualificados (96dias contínuos), tabela inteira crescente deXP e carry determinístico. Referência mantida: melhor perfil mediana109dias/holdout107; perfil2h+8hoffline mediana299dias. 90–120dias é a meta do melhor cenário, não de todo jogador, nem prazo para+20. Transferências não concedemXP/conquistas. Dano excedente não acelera o tempo qualificado além do benchmark da candidata3.

Uma única atividade econômica por conta, também entre abas/aparelhos: torre, uma hunt ou evento exclusivo. Tempo de raid/boss/evento substitui tempo de farm; nenhum segundo contabilizado duas vezes. Offline máximo8h por dia de Brasília e por ausência (debitar cada segundo no dia correspondente, sem renovar a cota ao reconectar), no último andar comum concluído e seguro, build congelada, sem subir andares, repetir boss ou participar de evento. Reconectar várias vezes não duplica intervalos; relógio/ledger do servidor decide. Torre comum pode repetir andares vencidos exceto boss. Hunt tem inimigos de força elevada, mas não concede uma segunda recompensa de boss da torre.

Torre principal:Coin,XP,equipamento e raro pergaminho. Hunts:apenasXP e respectivo material. Dificuldade carvão<ferro<ouro; manter rampas/custosR1.1, sem reintroduzir clique ou produção passiva. Bosses da torre continuam etapa própria, sem rebalanceamento neste fechamento.

## 2. Jade: contrato do futuro boss diário

Fonte exclusiva:boss global diário. **3jade por conta/edição diária**, sem bônus de ranking, último golpe, VIP ou tamanho do dano. Conta deve ter concluído o andar100 e acumular600segundos de participação válida; fora do encontro não há presença. Conta suspensa ou incapaz de participar não ganha. Contar ações/ticks autoritativos e elegibilidade, não mensagem de presença do cliente. Jade vinculada, sem mercado, correio, guilda, conversão, mina ou recompensa de anúncio.

A janela de acesso será o dia inteiro de Brasília; as22h ficam como horário do clímax coletivo, sem restringir elegibilidade a30minutos. Se o boss global cair cedo, os demais participantes têm uma instância de contribuição da mesma edição até o fim do dia, sem segundo loot ou jade adicional. Se o grupo não matar o boss, participação qualificada ainda concede as3jade: a disponibilidade econômica não pode depender da população online. Não há entrada paga. Esse é o contrato de disponibilidade; desenho/combate/abuso de presença ficam para a fase dedicada. Não alegar que o boss atual já satisfaz isso.

Entrega automática única pela edição+conta, atômica com ledger/outbox; ausência no instante da virada não perde prêmio já adquirido. Reinício/retry não duplica. Sem recuperação de dias em que a conta não participou. +16–20 permanece desligado até esse caminho estar implementado e validado; não criar jade provisória.

## 3. Proteção: oferta total e falhas

Mesmo pergaminho em todas as fontes, vinculado à conta, acumulável, sem validade, sem troca ou transferência. Evento periódico gratuito:30/semana, em seis marcos de5minutos de participação válida,5por marco;1800segundos no total, com resgate único por semana/marco. Progresso pode ser distribuído pela semana; a semana é segunda00h de Brasília. Marco concluído é entregue automaticamente; não há prêmio por simplesmente criar uma conta. Nenhum marco exige compra ou jade; dificuldade acessível após andar1. Detalhes visuais e variedade do evento serão implementados depois, sem alterar esse orçamento.

Torre:20ppm por inimigo elegível (0,002%), andar comum≥100, nunca hunt ou boss. Sem aumento por Sorte, buffs ou anúncio. Amostrar do RNG autoritativo e persistir resultado com morte; offline aplica exatamente a mesma regra, não uma nova rolagem ao coletar. A repetição de andares mantém essa chance por abate; testar a eficiência por faixa antes de liberar. Eventos+drop contam juntos na oferta; a raridade de+20 não pode ser inferida só da chance da última tentativa.

Loja futura:mesmo item, teto10por conta/semana, sem presente/pacote de iniciante que ultrapasse o teto. **Loja desligada**, preçoRuby e preço em dinheiro serão definidos apenas na fase final de monetização. A validação econômica deve assumir os10sempre comprados, independentemente do preço; portanto não depende de um preço provisório. Ruby existente não pode ser gasto em proteção antes dessa fase. LoteriaRuby antiga fica suspensa no corte econômico, sem revogar saldo já adquirido. Novos prêmiosRuby/eventos exigirão revalidação conjunta.

Proteção selecionável a partir da tentativa destino+8. Consome1na tentativa, inclusive sucesso, e não melhora chance. Falha protegida−1. Destinos+1–3:falha mantém; +4–7:falha−1; +8–12:regressão/quebra conforme tabelaR1.1; +13–20:falha não protegida quebra. +16–20 somente lendário+. Faixa alta mantém chances32/27/22/17/12% da candidata3; não usar os42/40/38/35/30% da proposta histórica. Coin/materiais sempre gastos na tentativa. Sem failstack, pity ou reset por comércio. +20 é prestígio opcional; campanha não o exige.

## 4. Mercado e controle de alts

Novo mercado precifica **somente emCoin**. Materiais negociáveis:carvão,ferro,ouro; equipamentos normais negociáveis conservamID,raridade,nível,qualidade,afixos válidos e refino. Jade,pergaminhos,Ruby e créditos legados são vinculados. Sem venda direta deXP, conquistas ou pontos de atributo. Alts não podem funilar jade/proteção diretamente; vender equipamento melhorado ainda transmite vantagem econômica. Não prometer eliminar essa vantagem nem resolver mult conta só com limite por conta.

Preservar inicialmente taxa100.000Coin/anúncio,10%na venda, prazo72h, cooldown24h após cancelar e andar10 para negociar. São valores existentes, não uma taxa ótima demonstrada. Reavaliar acessibilidade/liquidez com renda integrada e contas novas; se reprovar, ajustar em versão explícita antes da ativação. Oferta revalida preço/saldo/instância/limites no commit; item em escrow não pode equipar, refinar, descartar ou mudar de afixo. Compra/cancelamento/retry são mutuamente exclusivos e idempotentes. Receita de venda não pode contar como geração deCoin ouXP. Monitorar concentração, circularidade e negociações coordenadas; não punir automaticamente famílias/rede compartilhada peloIP.

## 5. Fontes secundárias e sistemas antigos

| Sistema | Decisão para a primeira versão v2 |
|---|---|
| Descarte voluntário | SóCoin: max(1,floor(nível×multiplicador de raridade×0,5)); multiplicadores1/1,15/1,35/1,75/2,25. Sem retorno de refino/material/pergaminho; nunca jade. Confirmação explícita para peça rara ou refinada. |
| Mochila cheia | Cofre de resgate persistente, sem expiração, com instância preservada; sem conversão automática em ferro,Coin ou descarte silencioso. Resgate só com espaço; não conceder o mesmo item duas vezes. |
| Fundição/forja | Aposentadas no cortev2 inicial; obtenção de novos equipamentos pela torre. Receitas e ferro fundido antigos ficam no arquivo legado, sem conversão em material novo. Uma futura forja exigirá balanço próprio. |
| Pet de mineração | Visual/propriedade preservados; bônus econômico de mineração aposentado. Nenhum novo bônus de combate atribuído sem teste. |
| Tônicos | Estoque/histórico preservados no arquivo; efeito de poder não entra no combatev2 inicial. Não vender/consumir algo sem efeito. |
| Afixos | Sem rolagem/reciclagem nova no lançamento inicial; novos itens usam apenas atributos previstos na calibração. Afixos antigos arquivados, sem multiplicadores extras ocultos. |
| Arena/guerra/raid/eventos legados | Competição/social podem continuar, mas grantsCoin/material/XP/equipamento/Ruby devem ser desligados ou mapeados antes do corte. Primeira versão:recompensas cosméticas/troféus; exceções econômicas só jade diária e proteção semanal acima. |
| Loja/anúncios experimentais | Permanecem desligados. Autoclique, bônus deCoin/XP/dano e renda dupla não atravessam o corte. |

Cofre evita perda de loot; o limite100 do simulador não é regra de descarte do produto. Mudança em oferta de itens/cofre precisa de sensibilidade de mercado e contas legadas; os resultados históricos não validam esse detalhe automaticamente.

## 6. Migração e compensação: nenhuma alteração de conta nesta etapa

Contrato de corte único por conta, transacional e reversível por backup. Antes do corte:pausar gravações econômicas, resolver comandos em voo e retirar anúncios/ofertas legados, devolvendo exatamente os bens e taxas de anúncio do saldo ainda elegível; após isso, capturar snapshot/instâncias/ledger/escrow/recibos/dívidaRuby. Nenhum gasto reembolsado duas vezes. Ruby e suas dívidas/origens continuam íntegros; nunca duplicar Ruby ao restaurar snapshot.

Preservar identidade,nick,guilda,cosméticos e histórico de conquistas. Separar os campos:nível/XP/andares antigos ficam como **legado consultável**, sem reinterpretar `heroXp` como segundos qualificados. A nova trilha de domínio começa em1/XP0/andar1; isso é uma transição de progressão, não apagar o histórico. Explicar a diferença na tela de migração antes de qualquer corte. Não há mudança silenciosa no save.

Saldos e investimentos antigos geram registro nominal **vinculado e sem poder econômico**:quantidade por recurso, níveis/receitas e despesas realmente comprováveis. Sem converter todo estoque antigo emCoin/material novo, nem presumir que um save local importado prova compras/tempo. Seu crédito de reconhecimento é a soma nominal segregada por recurso dos saldos e custos históricos auditáveis, não uma moeda única com câmbio inventado. Níveis conhecidos sem ledger usam a tabela versionada antiga; custos desconhecidos ficam identificados como não comprovados, preservando o original. Reconhecimento/cosmético legado sem bônus de poder e sem saque/comércio; não é reembolso financeiro nem restituição deRuby.

Equipamentos antigos:original imutável no arquivo; uma conversão porID, mantendo raridade/base visual/qualidade dentro da faixa legal e nível limitado1–100; refino novo min(refino antigo,7). Nível do personagem novo deve liberar o nível do item (1+(nívelItem−1)×10). Peça alta aguarda no cofre e não equipa antecipadamente. Afixos antigos,stats impossíveis e raridade incompatível não atravessam como poder:usar basev2 da definição com procedência explícita. Refino antigo+8–20 continua visível no histórico, sem título falso de+20v2 ou duplicação negociável. Itens já quebrados/gastos não reaparecem. Bases desconhecidas ficam arquivadas para revisão, sem sumir do original.

Essa política evita importar estoques de clique/autoclick e refino determinístico como riqueza rara da nova economia. É uma decisão de design com impacto na progressão legada; o ensaioR2 deve gerar relatório por conta mostrando antes/depois, sem executar o corte. Nenhuma redefinição de conta foi feita aqui. Testar coortes legadas com bases raras/altas bloqueadas, reembolso de escrow, saldos extremos e saves locais adulterados antes de aprovar ativação.

## 7. O que está fechado e o que ainda precisa passar

Fechados os contratos de fonte, limites, vinculação, aposentadoria e compensação. Mantida a calibração candidata3; não ajustadas chances/custos para fazer um teste passar. Valor comercial deRuby/integrações fica explicitamente na fase final; orçamento pago máximo já é finito e independe do preço.

**Isto não transforma o gate de completude em aprovado.** Pendências agora são verificações e implementações concretas:dry-run de migração/rollback; simulação acoplada de mercado+fontes+estoques legados+cofre; coortes de participação em eventos/boss, falha/crítico e contas sem compra; testes do motor real, concorrência e equivalênciaonline/offline; playtest. R2 pode ser preparada em branch desativada como próximo escopo, sem executar migração de produção ou ativarv2 até os gates passarem. Boss/loja não foram implementados nesta entrega.

Ordem:contratos fechados→ensaioR2→combate/buildsR3→huntsR4→equipamento/refinoR5→integraçãoR6/R7→bosses/jadeR8→beta→distribuiçãoPWA→monetizaçãoR9. Antes de cortar a economia, toda fonte antiga deve ter decisão testada, todos os bens devem ter destino e a ausência de jade definitiva deve bloquear+16–20.
