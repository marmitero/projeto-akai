# Mercado — Fase 7

Configuração experimental `market-1`. Mercado entre jogadores em **Mais → Mercado**, somente no modo online. Loja premium e mercado são destinos distintos. `jogar.bat` continua sendo o preview local, sem inventar outros jogadores ou iniciar banco silenciosamente.

## Bens e preços

| Regra | Implementação |
|---|---|
| Entrada | Andar 10 concluído para anunciar, comprar ou oferecer; leitura e resgate não exigem andar |
| Equipamento | Uma instância não equipada por anúncio; atributos, raridade, afixos, nível e aprimoramento preservados |
| Recursos | Ferro, carvão, ouro e jade, com quantidade exata em milésimos |
| Pagamento | Coins, ferro, carvão, ouro ou jade; recurso vendido não pode ser a própria moeda de pagamento |
| Ruby | Sem anúncio, preço ou contraoferta em Ruby; sem conversão premium |
| Mascotes/skins | Sem instâncias transferíveis elegíveis no domínio atual: Musgo é um companheiro de conta; skins não existem. Não são anunciáveis |
| Custo para publicar | 100.000 Coins, debitados junto com a reserva; não devolvidos em cancelamento, expiração ou remoção |
| Taxa da venda | 10% **na moeda da transação**, `ceil(preçoMínimo/10)`, sem taxa adicional em Coins |
| Preço e quantidade | Inteiros positivos em unidades mínimas, até 30 dígitos; UI aceita até 3 casas decimais. Preço mínimo 0,002 para líquido positivo |
| Prazo | 72 horas corridas do relógio do servidor, com limite exclusivo: no instante final não há venda |
| Oferta | Uma pendente por comprador/anúncio; até 24h, limitada pelo fim do anúncio; saldo não reservado |

A venda é do lote inteiro; não há leilão automático, compra parcial ou oferta livre de saldo. A oferta pode propor outra moeda permitida; o vendedor revisa preço/moeda/líquido antes da aceitação. Criar oferta exige saldo disponível naquele instante; aceitar verifica novamente saldo, conta, mochila e disponibilidade. Sem saldo, nada é debitado e a oferta continua pendente até rejeição, retirada ou expiração. Vender fecha todas as ofertas irmãs.

## Reserva e recuperação

Publicar remove o equipamento da mochila ou debita a quantidade do recurso e guarda a cópia autoritativa no anúncio. Logo, comandos normais de equipar, melhorar, reciclar ou gastar não conseguem usar o bem reservado. O anúncio é imutável quanto a preço e bem: cancelar e publicar novamente são operações distintas.

Cancelamento, expiração e remoção pelo operador mantêm o bem em **resgate pendente**. O dono deve resgatar em Meus anúncios. O custo de publicação não retorna. Equipamento exige vaga na mochila: se estiver cheia, o resgate fica guardado sem conversão, destruição ou concessão repetida. Compra também exige vaga; não há cobrança antes de resolver essa condição. Recursos respeitam o teto de saldo existente. Até 20 anúncios ativos ou resgates pendentes por vendedor impedem acúmulo ilimitado de correio gratuito.

Cancelar antecipadamente, inclusive remoção por moderação, bloqueia por 24h a relistagem do mesmo equipamento. Um UUID de procedência persistido em `akai_market_items` acompanha a peça ao receber novo ID local de inventário; resgatar não contorna o prazo. Aprimorar mantém a procedência; reciclar destrói a peça. Na compra o novo dono recebe sua própria instância de inventário, sem colisão de ID.

Para pilhas, o bloqueio cobre **toda a categoria do recurso na conta vendedora**, inclusive unidades novas, divididas ou mescladas, por 24h. Anúncios anteriores já ativos não são alterados. Essa restrição conservadora evita fingir identidade individual de minério fungível. Expiração natural não impõe cooldown. Compra legítima não cria cooldown no comprador. Isso não elimina contas alternativas ou acordos externos.

## Atomicidade e auditoria

Migração aditiva `003_market.sql`, preservando sessões, saves, saldos e itens. Transações usam o mesmo lock global social `41652006` da F6 antes dos locks de conta; participantes são bloqueados em ordem de UUID. O loop F5 continua usando lock individual. Relógio, ativos, taxas e IDs vêm do servidor; o cliente envia apenas intenção e identificadores. A sessão é revalidada após a operação e antes de confirmar.

Na mesma transação: revalidar anúncio/oferta, conciliar ambos os perfis, conferir saldo/capacidade, transferir o bem, debitar comprador, creditar líquido ao vendedor, registrar taxa e transação, fechar anúncio/ofertas, salvar snapshots/ledger/outbox e resultado de comando. Falha inesperada reverte tudo, inclusive o identificador do comando, permitindo retry. Rejeição de domínio persiste seu resultado: mesmo UUID mantém a recusa, e nova tentativa consciente usa novo UUID. Mesmo UUID com payload diferente é conflito.

`akai_market_trades`, `akai_market_commands` e `akai_market_audit` são append-only por trigger contra UPDATE/DELETE. Expirações geram auditoria automática; cancelamentos, resgates, recusas, publicação e ofertas registram ator, intenção, resultado e hora. Histórico retorna últimas 50 transações privadas de cada parte; oferta só aparece ao comprador e vendedor. Auditoria completa fica no banco, sem endpoint administrativo público.

O piloto compartilha o cap de 5.000 perfis da comunidade e limita 5.000 anúncios ativos, 20 pendências por vendedor e 20 ofertas pendentes por comprador. Listagem pública tem filtros por categoria/moeda e páginas de 50 (offset até 5.000); até 100 ofertas pendentes são apresentadas por consulta. Dados encerrados e auditoria ainda exigem política de retenção antes de produção; não são apagados para liberar limites de anúncios ativos.

## Operação

```sh
npm run db:migrate -w @akai/server
npm run test:market
npm run simulate:market
npm run test:browser:market
npm run test:browser:market:preview
npm run db:reconcile -w @akai/server
```

Os testes PostgreSQL/browser exigem `TEST_DATABASE_URL` isolado. O teste de navegador cria dois perfis de fixture com saldo e equipamento semeados pelo harness no banco; não fornece endpoint de concessão ao jogador. Browser usa o executável Playwright instalado ou `AKAI_CHROMIUM_EXECUTABLE`.

Operador com credencial de banco e `DATABASE_URL` pode remover anúncio ativo, com motivo e auditoria:

```sh
npm run market:admin -w @akai/server -- operador UUID_DO_ANUNCIO "Motivo da remoção"
```

Remoção não transfere nem destrói o bem e não reembolsa custo. Não há comando para forçar venda, editar preço, gerar saldo ou reabrir anúncio encerrado. Suspensão/revogação de sessão continuam pela CLI de comunidade; todo participante do mercado tem perfil moderável, mesmo que nunca abra o chat. Anúncios de suspensos somem da busca e sua venda/aceitação é bloqueada; bens permanecem reservados para revisão e eventual restauração. Nada é confiscado silenciosamente.

GET `/api/v1/market` e POST `/api/v1/market/commands` herdam proteção Origin/CSRF/cookie e limite HTTP da F5. Comandos: 30/min/sessão. Scheduler de 10s fecha vencidos, também verificados antes de toda leitura/ação; atraso do scheduler não estende prazo. UI consulta a cada 3s enquanto aberta/visível. Comando pendente mantém UUID em sessionStorage por conta e é repetido após perda de resposta/recarga; não há saldo ou item concedido otimisticamente.

## Economia e limites de evidência

[Simulação determinística](phase7-economy-simulation.json): custo de anúncio equivale a 834 vitórias individuais do andar 10 e 15 no andar 100, ignorando tempo, derrotas e outros prêmios. Vender por 100.000 Coins deixa 90.000 líquidos, portanto perde 10.000 Coins **além do bem vendido**, considerando o custo inicial. 100 transações recíprocas de 1 milhão de Coins queimam 20 milhões entre anúncios e taxas, sem gerar moeda.

Mantidos os valores do prompt em desenvolvimento, sem alegar equilíbrio de produção. Antes de abrir ao público: observar acessibilidade dos anúncios, preços por tipo/raridade, volume de vendas, cancelamento/expiração, concentração e abuso; comparar custo com renda orgânica e ajustar por nova config versionada. Negociação não garante valor de revenda nem dinheiro real. Publicidade, pagamentos e lojas de F8 não estão ativados.

Evidências e faltas atuais em [STAGE_07_REPORT](STAGE_07_REPORT.md). Sem teste de escala comercial, soak novo de 30min, aparelhos físicos ou playtest humano competitivo nesta entrega.
