# Sistemas RPG implementados — Fase4

Configuração experimental `local-rpg-1`. Fontes canônicas executáveis: packages/shared/src/content.ts, rpg.ts, loop.ts e rpg-schema.ts. Sem custo real, anúncios ou economia online.

## Catálogo e atributos

1.000 definições `tower-N`, com o mesmo bioma de floresta e família Skeleton validada; boss a cada10. Comuns3×3, boss único/30s; pausa/retry/treino manual preservados. Os atributos1–20 permanecem os da F3. Para f>20:

| Atributo comum | Fórmula |
|---|---|
|HP | ceil(156×(1+(f−20)/20)²) |
|ATQ | ceil(13×(1+(f−20)/40)) |
|Coin | ceil(19×(1+(f−20)/20)²) |
|Boss | HP×8, ATQ×2, Coin×15 |

Máximos do catálogo:3.120.000HP,664ATQ e712.500Coins por morte. Não extrapolar além1.000. Melhorias até1.000: níveis até20 mantêm fórmulas F3; depois custo cresce pelo quadrado de(1+(n−20)/10), ancorado no custo arredondado do20. Carvão mantém a curva até50 e ancora a continuação em n=L−1=49. Quantias são calculáveis sem overflow de Number; saldos são BigInt em strings de milésimos.

Cada morte nova concede guerreiro10×f XP e rei2×f XP. Nível= min(1.000,1+floor(sqrt(XP/100))). Não há XP offline ou retroativo. O guerreiro ganha2ATQ e10HP máximo por nível após o primeiro. Rei tem nível separado, sem bônus de combate oculto. Atributos de equipamentos somam antes do tônico; defesa reduz dano recebido por max(1,floor(ATQ_inimigo×100/(100+DEF))). Crítico e magia não foram ativados.

## Equipamentos

| Definições | Slot | Particularidade |
|---|---|---|
|sword/dagger/axe/mace/spear | Arma | Uma arma ativa |
|greatsword/bow | Arma | Duas mãos; bloqueia escudo |
|shield | Escudo | Rejeitado com arma de duas mãos |
|armor/hat/gloves/boots | Peitoral/cabeça/mãos/pés | Bônus próprios configurados |
|pendant | Colar | Um slot |
|ring | Anel1 ou2 | Instâncias diferentes |

Instância `item-N` única, nível1–100, raridade, atributos rolados, afixos únicos e aprimoramento0–20. Nível requerido de guerreiro=nível da peça. Drop usa ceil(f/10), limitado100; fabricação usa até min(100,1+floor(maiorAndar/10),nívelGuerreiro).

ATQ/HP-base= floor(coeficiente×nível²×raridadeBP×variaçãoBP/10⁸); variação9.000–11.000BP. Defesa-base usa coeficiente×nível×raridade. Coeficientes por categoria em content.ts. Rolls ficam persistidos: mudança de tela/reload/aprimoramento não sorteia atributos novamente.

| Raridade | Multiplicador | Afixos |
|---|---:|---:|
|Comum |1,00× |0 |
|Incomum |1,15× |1 |
|Raro |1,35× |2 |
|Épico |1,70× |3 |
|Lendário |2,20× |4 |

Pool sem repetição: Força(+nível²ATQ), Vigor(+2×nível²HP), Proteção(+nívelDEF), Prospecção(+500BP mineração), Indústria(+500BP produção). Aprimoramento aplica ceil(atributo×(1+0,05×n)) a todos os atributos, máximo+20. A lista mostra valores-base e aprimoramento; resumo do guerreiro mostra os valores finais. Equipar/retirar/ativar não cura; HP só é reduzido se superar o máximo novo. Ícone de equipamento não troca a animação corporal: o guerreiro mantém o rig-base disponível.

Inventário120, incluindo equipados. Fabricar com mochila cheia é rejeitado sem débito. Drop excedente vira10×nível ferros, de forma atômica com a morte/RNG; não gera caixa invisível. Reciclar devolve10×nível ferros e destrói somente peça não equipada; custos de aprimoramento não são reembolsados. Não há mercado, escrow ou venda premium ativos.

## Drops

Comum0,5%; boss min(20%,10%+0,1 ponto percentual×(f/10−1)). Não há equipamento garantido por morte. RNG local xorshift32, seed de desenvolvimento, estado persistido. No boss10, raridades condicionais50/32/15/2,8/0,2%; em comuns80/17/3/0/0%. Bosses posteriores transferem até10pp de comum para raro; lendário não aparece em comum. Sem pity ou chance paga.

A morte já persistida não sorteia outra vez. Cada nova tentativa tem IDs diferentes e pode render recursos novos; controles antiabuso online serão da F5. Fonte online nunca aceita RNG, item ou saldo do cliente.

## Forja e tônicos

| Operação | Custo/resultado |
|---|---|
|Ferro fundido |10 ferro+5 carvão →1 material |
|Peça comum nível1 |30 ferro+20Coin |
|Peça nível l>1 |30l² ferro+20l²Coin+5l carvão+2l ferro fundido; +l ouro a partir10; +ceil(l/10)jade a partir30 |
|Aprimorar peça l para+n |20ln ferro+10lnCoin+ln ferro fundido; +n ouro se l≥10; +n jade se l≥30 |
|Tônico de combate |50 ferro+10 carvão+50Coin; +20%ATQ por60s |
|Tônico das minas |Mesmo custo; +25%produção por300s |

Preparar tônico aplica imediatamente, sem item consumível fictício. Um de cada tipo; o mesmo tipo ativo rejeita novo gasto. Prazo persiste e continua ausente. Expiração precede ataque no instante limite; produção só inclui o trecho válido. Recursos e benefício são confirmados no mesmo draft/snapshot.

## Musgo e minas

Musgo é Slime green domesticado, incomum. Adoção200 ferro+20 carvão+100Coin, inicia nível1 ativo. Evoluir do nível n≥1:100n² ferro+10n carvão+50n²Coin; +n ouro a partir50; máximo100. Um ativo, guardar/ativar gratuito. Cada nível ativo:+5HP máximo e+2%produção das minas. Sem drop/negociação de pet ou retrato inventado.

| Mina | Desbloqueio | Taxa-base por nível |
|---|---|---:|
|Carvão |100 ferro+50Coin |0,1/s |
|Ouro |Carvão50 e50.000 ferro+500 carvão+10.000Coin |0,02/s |
|Jade |100.000 ferro+1.000 carvão+100 ouro+25.000Coin |0,005/s |

Melhoria de ouro do nível n>0: fator=(n+1)²;1.000×fator ferro+10×fator carvão+500×fatorCoin. Jade:2.000×fator ferro+20×fator carvão+fator ouro+1.000×fatorCoin. Máximo1.000. Não clicar manualmente nessas minas.

Passivo=10.000BP+Indústria equipada+200×nívelMusgo ativo. Tônico multiplica isso por1,25 somente durante seu prazo. Mineração manual recebe apenas Prospecção equipada; não recebe Musgo/tônico das minas. Cada clique credita floor((1+nívelClique)×(10.000+ProspecçãoBP)/10) milésimos.

Produção preserva remainder por recurso com denominador40.000.000: taxa-base em milésimos/s×passivoBP×(4×deltaMs+msComTônico), mais resto anterior. Não há arredondamento por save. Offline aplica até8h iniciais da ausência, só minas, com o tônico expirando no intervalo correto. Resumo de ausência≥1s mostra valores já creditados; períodos menores ainda são conciliados, sem poluir a HUD.

## Persistência e limites

Schema3 migra1/2 após SHA do payload original. Schema2 ativo mantém batalha e valores; torre20 completa segue21 com cura normal. Remainder antigo×40.000; saldos/perfil/geração preservados. Sem XP/loot retroativos. Save comporta inventário limitado, valida referências/IDs/slots e mantém backup/CAS/quarentena. Versões futuras nunca são apagadas por downgrade.

Testes e resultados: STAGE_04_REPORT, phase4-rpg-results.json e phase4-loop-results.json. As simulações de estatística/fixture final não equivalem a balancear o percurso orgânico inteiro. Áudio, aparência por equipamento, mais biomas e espécies de pet, habilidades avançadas e playtest em aparelhos continuam expansões documentadas; online pertence à F5.
