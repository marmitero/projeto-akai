# Monetização — Fase 8 técnica de teste

Configuração `monetization-test-1`, 15/10/2026. **Implementação de sandbox local assinada e adaptador backend Google Play de teste. Não há checkout real, anúncios reais, preços financeiros ou certificação de sandbox dos provedores.** Os dois tipos de evidência são distintos.

## Modos e isolamento

| Modo | Estado |
|---|---|
| `off` (padrão) | Loja informa indisponibilidade; sem rota simuladora nem concessão premium |
| `sandbox` | Simulador local explícito, recibos HS256 assinados pelo servidor e estado do provedor em tabela separada |
| `google-play-test` | Adaptador consulta API Google com OAuth de service account; aceita somente `testPurchaseContext.fopType=TEST`, uma unidade e conta vinculada. Exige cliente Android/conta/produtos de teste externos |
| Produção monetizada | Não existe nesta fase; modos de teste recusados com NODE_ENV=production, host público ou origem pública |

Os modos de teste exigem `MONETIZATION_TEST_DATABASE=true`, chave aleatória de64hex e um **banco descartável separado de qualquer conta real**. A migração004 cria marcador persistente do modo: o mesmo banco não pode voltar a `off` nem trocar sandbox↔Google para ser promovido ao ambiente normal. Encerrar teste significa usar outro banco limpo, não apagar o marcador para reaproveitar saldos simulados. O teste automatizado usa schema isolado que é removido ao terminar; um teste manual deve usar banco dedicado.

Chave, service-account JSON e tokens nunca entram no repositório, resposta de leitura, relatório ou log. O servidor usa AES-256-GCM com nonce aleatório para guardar tokens verificáveis; guarda hash global único para replay/ownership. A chave precisa permanecer estável para restaurar recibos após restart; perdição/troca da chave exige recuperação operacional, não emitir outro grant. Não é uma solução de gestão de segredos de produção já implantada.

## Catálogo de teste

| ID estável | Produto | Concessão experimental |
|---|---|---|
| ruby_handful | Punhado |100Rubies |
| ruby_bag | Saco |550Rubies |
| ruby_pot | Pote |1.200Rubies |
| ruby_chest | Baú |2.600Rubies |
| title_miner | Guardião das Minas |Entitlement de título cosmético, exibido no cabeçalho; nenhum atributo competitivo |

Todos têm **preço real indefinido**. Quantidades são de desenvolvimento, simuladas e sujeitas a revisão antes de oferta financeira. Não há desconto comercial, checkout web pago, assinatura, loot box pago, conversão de Ruby em recurso ou Ruby negociável. Bônus permanentes de poder ficam sem SKU: impacto competitivo/financeiro exige decisão própria; um botão desativado não conta como implementação desses produtos.

## Compra, entrega e recuperação

Loja → solicitar compra de teste → revisar → intenção vinculada à conta/SKU com30min. Somente no sandbox o botão explícito conclui uma compra **simulada**. O servidor-simulador emite recibo assinado e guarda estado autoritativo; o navegador devolve o comprovante para verificação. Não existe campo de saldo/quantidade concedida controlado pelo cliente. Um booleano `watched`/`paid` não pertence ao contrato.

Google Play usa o token recebido do checkout nativo e consulta `purchases.productsv2.getproductpurchasev2`. Conta é vinculada por SHA256 de prefixo estável+accountId, enviado pelo cliente nativo em `setObfuscatedAccountId`; SKU, quantidade, estado e contexto de teste são revalidados. Credenciais OAuth são somente de servidor; host/token URI do provedor não vêm do cliente ou JSON. Pacote configurado limita a consulta. Não se aceita compra real fora do contexto TEST.

Uma intenção expirada/cancelada localmente não impede entregar uma compra genuína já concluída e validada para a mesma conta/SKU. Isso evita perder conteúdo por atraso do callback. Cancelar solicitação não cancela nem estorna um pagamento do provedor. Pagamento `PENDING` não concede nada; `CANCELLED` não concede e não ressuscita por um replay posterior. Mesmo token não pode servir a outra conta ou gerar outro crédito.

Sob lock social antes do lock de conta, uma transação concilia o perfil e confirma juntos: recibo, fonte única de concessão, saldo/entitlement, ledger, outbox, intenção e auditoria. Rejeições de domínio persistem com o UUID do comando; falha inesperada reverte tudo. O cliente guarda comando pendente por conta em sessionStorage e repete o mesmo UUID após perda de resposta/reload. Recibo/token nunca é mostrado na interface.

Consumo/acknowledgement acontece **depois** do commit de entrega, numa fila persistida: consumíveis usam consume, cosmético acknowledge. Falha de rede não recria Ruby. Worker a cada10s processa até5recibos elegíveis, com backoff por recibo de2s até15min; falha de um não paralisa os outros. `verified_at` permite revisar compras concedidas e detectar cancelamento/estorno consultando novamente o provedor. Sem RTDN público instalado nesta etapa; reconciliação é polling/restore.

Restaurar verifica lotes de até50recibos já conhecidos, sem conceder novamente. O simulador também descobre, em lotes, comprovantes emitidos mas cuja resposta se perdeu antes de envio ao backend. Google Play não fornece essa descoberta por uma lista arbitrária de contas: o cliente Android deverá consultar compras da plataforma e reenviar os tokens pertinentes. Esse trecho depende da F9 e do teste externo. Entitlements continuam no servidor após restart/reload.

## Estornos

Revogar compra antes concedida é operação atômica e auditada por fonte. Cosmético perde entitlement. Ruby disponível é retirado até zero; se já gasto, a diferença fica como dívida separada, sem saldo negativo. Novas **compras de Ruby** abatem a dívida antes de disponibilizar o restante; concessões históricas não são editadas. Repetir revogação não desconta duas vezes. O projeto ainda não tem gasto/conversão de Ruby habilitado, mas o cenário de gasto já foi exercitado pelo harness. Futuras operações de Ruby devem considerar dívida e políticas próprias antes de ativação.

## Recompensas voluntárias

| Tipo | Regra de teste |
|---|---|
| autoclick |120s,3cliques/s de ferro autoritativos; potencial360cliques com presença contínua |
| battle_rewards |120s de Coins e XP da torre em dobro; não duplica itens, chance de drop ou prêmios competitivos |
| battle_damage |120s de dano da torre em dobro; não muda os atributos usados por arena/boss global/guerra |
| coins |10×Coin por inimigo do maior andar concluído; mínimo30, máximo1milhão de Coins, valor congelado na intenção |

Andar1 concluído, uma intenção pendente, no máximo8solicitações em janela móvel24h e intervalo5min. Solicitações canceladas/expiradas também contam: não é possível reiniciar intent para contornar o limite. Intenção dura10min. Mesmo tipo não acumula nem estende bônus ativo; os limites adotados não permitem sobreposição normal. Regras numéricas são experimentais, não uma oferta comercial.

No simulador, o usuário inicia voluntariamente e só pode concluir após5s do relógio do servidor. Isso **não comprova visualização de anúncio real**. A concessão exige recibo assinado e conta/intenção válidas, sendo claramente rotulada como teste. AdMob real permanece sem transporte/SDK configurado. Existe verificador criptográfico puro SSV com ECDSA DER e query bruta, exercitado com chaves de fixture; ele sozinho não concede nada e não certifica integração AdMob.

Bônus são linhas server-side com start/end: `OnlineService.settle` integra somente a presença confiável e os instantes válidos. Autoclick não cria cliques offline nem passa pelo rate limit de input manual. Multiplicador de dano/Coins/XP é escolhido por instante do golpe, com fim exclusivo, inclusive no tick que coincide com expiração. XP de anúncio dobra o XP da torre já modificado por evento/guilda; não muda XP offline, minas passivas ou eventos competitivos. Bônus de dano soma-se ao resultado normal do tônico de combate por multiplicação2×; não altera o tônico persistido. Local continua com os parâmetros padrão, sem premium.

## Configuração manual de desenvolvimento

Copie `.env.example` para configuração privada, mantendo o arquivo fora do Git. Use outro banco criado apenas para teste. Exemplo dos campos, sem chave real:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PUBLIC_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://usuario:senha@127.0.0.1:5432/akai_sandbox_descartavel
MONETIZATION_MODE=sandbox
MONETIZATION_TEST_DATABASE=true
MONETIZATION_KEY=<64 caracteres hex aleatórios privados>
VITE_GAME_MODE=online
```

Execute migração e cliente/servidor conforme DEVELOPMENT. `jogar.bat` continua sendo perfil local e não ativa esse ambiente automaticamente. Não inventar player, pagamento ou anúncio em produção para tornar a loja aparentemente ativa.

```sh
npm run db:migrate -w @akai/server
npm run dev:server
npm run dev:client
npm run test:premium
npm run simulate:monetization
npm run test:browser:premium
npm run test:browser:premium:preview
```

Testes PostgreSQL/browser exigem `TEST_DATABASE_URL` isolado. Harness cria fixtures; nenhum endpoint de fixture fica disponível ao jogador. Alterar estado do provedor simulado exige operador, motivo, credencial de banco e o mesmo modo/chave:

```sh
npm run premium:admin -w @akai/server -- operador UUID_DO_RECIBO PENDING "Teste de pagamento pendente"
npm run premium:admin -w @akai/server -- operador UUID_DO_RECIBO PURCHASED "Teste de confirmação"
npm run premium:admin -w @akai/server -- operador UUID_DO_RECIBO CANCELLED "Teste de estorno"
```

UUID de recibo do simulador é encontrado pelo operador na tabela `akai_sandbox_receipts`; é diferente do ID de compra interno. CLI registra auditoria e roda reconciliação. Não há rota pública administrativa, concessão arbitrária ou ferramenta de apagar dívida/histórico.

## Fontes técnicas verificadas e dependências externas

Documentação oficial consultada em15/10/2026:

- [Compra de teste e estado ProductPurchaseV2](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2): campos de contexto TEST, estado, conta ofuscada, produto/quantidade e consumo.
- [Consulta do token](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2/getproductpurchasev2), [consumo](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/consume) e [acknowledge](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/acknowledge).
- [Fluxo Billing](https://developer.android.com/google/play/billing/integrate): verificação no backend, entrega e confirmação; cliente nativo e consulta de compras exigem integração própria.
- [AdMob SSV](https://developers.google.com/admob/android/ssv): conteúdo original da query assinado, ECDSA DER e rotação de chaves. Download/rotação real e transporte SSV não estão configurados.

Para encerrar o gate **externo** da F8: titular configura aplicativo/pacote, produtos/IDs e license testers no Play Console, concede API à service account sem enviar a chave no chat, prepara cliente Android de teste; configura unidade e conta AdMob/consentimento adequados; depois executar compras/pendências/estornos/ack/restore e SSV reais de teste, guardar evidências sem tokens. Preços reais e produtos que alterem poder exigem decisão própria do usuário após análise. Nenhuma conta foi criada ou pagamento contratado nesta entrega.

[Relatório F8](STAGE_08_REPORT.md) distingue testes locais, mocks HTTP das APIs oficiais e validação efetiva na conta do provedor. SDKs Android, teste em aparelho e conformidade de lançamento permanecem nas fases/gates correspondentes.

Ganhos de XP/recursos podem acelerar a progressão e influenciar poder competitivo futuro. A exclusão dos multiplicadores dos duelos/eventos é direta, não uma promessa de igualdade econômica. Simulação local não valida justiça competitiva nem justifica ativação financeira sem playtest/análise.
