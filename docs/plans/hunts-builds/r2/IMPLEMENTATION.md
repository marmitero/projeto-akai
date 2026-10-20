# R2 — contratos executáveis e ensaio de migração

20/10/2026. Implementação **inativa**. Não é o corte da economia nem uma atualização de combate/hunts. O jogo instalado ainda usa o motor anterior; esta etapa constrói a fronteira necessária para substituí-lo com segurança. [PR9](https://github.com/marmitero/projeto-akai/pull/9).

## Entregas

- `EconomyV2Schema`:versão/config separadas, atributos novos, uma atividade, progressos independentes, inventário/cofre, identidade de instância por conta, proteção e orçamento offline. Zero saldo novo; uma espada inicial comum, sem duplicar peças legadas. Equipamento acima do nível permitido fica no cofre; validação impede slots errados, instância duplicada e arma de duas mãos com escudo.
- Tabela de1000níveis em milissegundos inteiros qualificados, gerada comDecimal70dígitos e congelada no código. Teto8.294.400.000ms=96dias ideais, sem exponenciação deXP no runtime. Comparação independente comR1.1:nenhum milissegundo de diferença nos limiares. Não confundir essa unidade com `heroXp` antigo. A agenda de combate que concede esseXP seráR3/R4, não existe ganho deXPnovo nesta etapa.
- Plano de migração determinístico:arquivo completo do contexto original, hashSHA256canônico, projeção sem gastar estoque antigo, saldo/investimentos segregados sem poder econômico, dívidaRuby preservada como referência ao ledger existente. Itens convertidos têm procedência estável/refino máximo+7 e não perdem a cópia original no arquivo. Como o item antigo não tem qualidade explícita, conversão usaqualidade10000; atributos/variações/afixos originais permanecem no arquivo, sem tentar inferir qualidade de um bônus antigo.
- Escrow não resolvido e ofertas pendentes bloqueiam prontidão do plano. A etapa não cancela anúncios nem devolve taxas automaticamente. Registra gasto agregado por recurso/motivo do ledger, sem presumir que todo gasto representa investimento de mina; valoração de crédito continua nominal/não gastável. Não inventa despesas não comprovadas.
- Verificador recalcula todo o plano e o hash; ensaio de rollback restaura exatamente o contexto arquivado, sem tentar reverter aritmeticamente a nova progressão. Um hashdetecta divergência, não autentica arquivos editados por um operador:qualquer aplicação futura deve reler o servidor e comparar versão/hash na transação. Não existe endpoint ou comando de aplicação em produção.
- LeituraSQL `REPEATABLE READ READ ONLY` captura contas,escrow,ofertas,dívida e gastos num snapshot coerente. Não liquida batalhas, cria schema ou altera contas/ledger. CLI produz backup com criação exclusiva, sem sobrescrever; pasta backups ignorada peloGit. O conteúdo inclui dados de conta e deve permanecer privado.

## Jade revisada pelo usuário

Base3jade por600segundos qualificados, andar100concluído, conta não suspensa. Bônus por dano efetivo, só após morte real do boss:

| Posição | Jade adicional |
|---:|---:|
|1|200|
|2|180|
|3|160|
|4|140|
|5|120|
|6|100|
|7|80|
|8|60|
|9|40|
|10|20|

Último golpe:+250jade, cumulativo com ranking/base. Teto453por conta/edição. Para ranking/último golpe basta participação elegível com dano>0 e andar100;600segundos continuam sendo requisito dos3jade da base. Timeout não dá ranking/último golpe, mas mantém a base adquirida. Instância de contribuição pós-morte não recalcula placar nem último golpe. Empate:UUIDcrescente, sem sorteio/retry. Menos de10jogadores recebem apenas suas posições reais, começando no1ºlugar. Todos os valores vêm de snapshot final autoritativo; cliente não informa seu próprio dano.

`planDailyBossJade` produz ranking, grants identificados por edição+tipo+conta e texto do anúncio. O campo `jade` do plano é em unidades inteiras; saldos/ledger usam milésimos inteiros emstring, portanto250jade devem gerar250000milésimos no escritor, não250milésimos. **É um plano, não o escritor de recompensas.** Na integraçãoR8, saldo/ledger/registro de recompensa/placar fechado/outbox devem confirmar juntos, com unicidade e exclusão entre dois últimos golpes. O scheduler legado não foi convertido para essa regra. Nenhum jackpot foi criado no banco atual.

Consumidor de broadcast já implementado:leitura autenticada de registrosv2confirmados, nome e250jade no topo da batalha, texto seguro, fechamento e90sde exibição. Consulta15s enquanto batalha/documento visíveis. Sem registro, faixa oculta; prêmios legados emCoins não geram anúncio de250jade. A faixa ocupa altura no layout; não cobre o campo de chat. Testes de transporte inserem registro explicitamente de fixture, não alegam uma luta realv2. A integração do escritor de recompensas ao boss definitivo continuaR8.

## Impacto econômico: mudou o denominador

[Auditoria/sensibilidades](audit-results.json). Se≥10contas receberem base e houver morte, emissão diária total=3N+1350jade. O bônus não cresce com a população; sua concentração por conta pode ser alta.

| Participantes | Emissão diária total | Hipótese anterior | Multiplicador |
|---:|---:|---:|---:|
|1|453|3|151×|
|10|1380|30|46×|
|100|1650|300|5,5×|
|1000|4350|3000|1,45×|

Campeão+último golpe recorrente:40.770jade/90dias contra270antes. Isso **invalida a estimativa de1,67%de+20** como evidência da nova oferta. XPcontinua sem bônus temporal, mas disponibilidade de refino/preços/concentração muda. Não reduzimos os prêmios pedidos nem alteramos chances silenciosamente. Revalidar coortes com campeão persistente, posições rotativas, poucos jogadores, alts e mercado de equipamento; jade continua vinculada. Esta auditoria verifica conservação/budgets, não simula progressão/refino humano.

## Execução do ensaio

Com banco já inicializado e backup privado escolhido, após `npm run build`:

```powershell
$env:DATABASE_URL = 'postgres://akai:SUA_SENHA@127.0.0.1:5432/akai'
node apps/server/dist/economy-dry-run.js --out backups/economy-v2/ensaio-01.json --limit 100
```

`--at <milissegundos>` fixa a data do corte para reprodução exata; sem ele usa o instante atual. `--limit` entre1e5000; exceder o limite falha, sem omitir contas silenciosamente. Arquivo existente falha em vez de sobrescrever. Não rodar `migrate` ou ativar flag de economia para esse ensaio. Não há `--apply`. O CLI atual é ferramenta técnica; iniciadores Windows do jogo continuam iguais.

Reproduzir auditorias:

```bash
python scripts/economy-v2/generate-xp.py
npm run check
node scripts/audit-economy-contracts.mjs
node scripts/economy-v2/audit.mjs
```

## Validação e próximos trabalhos

Testes cobrem todos os limiares deXP, barreira de nível de equipamento, duplicação de instâncias, tabela de prêmios, soma/empate/BigInt, elegibilidade/timeout/último golpe inválido, idempotência do plano, corrupção/projeção adulterada e rollback exato. PostgreSQLemCI verifica leitura sem mutação e bloqueio deescrow; navegador testa anúncio autenticado de fixture, layout e fechamento. Resultados reais/limites da execução registrados noPR; não confundir testes locais sembanco comCI.

R2entrega contratos e **ensaio de transformação**, não migração aplicada nem rollback operacional ensaiado num deploy. Ainda necessários:execução doCLI emcópia representativa, validação econômica acoplada à distribuição nova deJade/cofre/legado, ferramenta transacional de corte com backup validado e recuperação deoutbox/escrow, integraçãoR3combate, R4hunts eR5refino, corteR6/R7 e bossR8. Sem ativar+16–20antes da fonte definitiva; monetização continuaR9final. O usuário autorizou seguir as demais regras; não pedir nova aprovação a cada fase, publicar cada entrega validada.

### Fechamento validado

Runtime head `ab6ba829bd0411cd14fb2d61f1ef127ab2dfdeef`, árvore `c773a7472363ff36f7b760aa3fff0e5854d86212`. [CI39436231165](https://github.com/marmitero/projeto-akai/actions/runs/39436231165) e [Windows39436231501](https://github.com/marmitero/projeto-akai/actions/runs/39436231501) aprovados.196testes/21arquivos com PostgreSQL16, zero skips; builds/tipos/assets e smokes completos passaram. Broadcast com fixture passou emdev/preview, sem scroll adicional do conteúdo e com fechamento. AuditoriaR2passou6populações, comparaçãoXP0ms, backup/restauração lógica exatos. TesteSQL de ensaio não modificou contas/ledger. Localmente99testes passaram e97PGforam pulados; coberturaSQLreal é aCI, não substituída por mocks. Executor local não tinhaChromium disponível nesta sessão; validação de navegador desta entrega foi naCI.

Fechamento posterior altera somente documentação; código do cliente/servidor, tabela, testes e scripts idênticos ao head validado. Nenhuma conta de produção foi migrada. A próxima entrega éR3motor/builds, com nova ofertaJade incluída nas validações de refino/mercado e integraçãoR8ainda pendente.
