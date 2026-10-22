# Fase 5 / V14 — mercado autenticado de teste

Etapa autorizada após a revisão da PR23. Implementação e validação concluídas na PR24; não é aprovação da economia real, de liquidez ou de capacidade pública.

## Contrato

O HTTP autenticado reutiliza MarketV2Service, os mesmos runs/revisões/carteiras/ledger de economia e eventos e as regras do mercado v2. Coin é a única moeda de preço; só equipamento não equipado e carvão/ferro/ouro são negociáveis. Sem Jade, Ruby ou pergaminhos negociáveis; taxa100.000Coin, imposto10%, prazo72h e cooldown24h intactos. Equipamento mantém ID/origem/qualidade/refino e vai ao cofre se faltar nível/espaço.

SQL009 cria apenas um pin vazio e imutável de mercado. Operador prepara coorte privada de2–20runs com market-v2-cli stage e executa authenticated-v13-cli bind-market --realm UUID. O roster deve ser exatamente o mesmo da autoridade V13, inclusive membros temporariamente desabilitados. Não existe autoinscrição, escolha de realm/ator pelo cliente, reset público ou injeção de fundos. Flags e restrições V13 continuam exigindo banco isolado, local/LAN, fora de produção, monetizaçãooff; rotas off por padrão.

POST /api/v1/test-v2/market recebe somente {commandId,expectedRevision,action}, com MarketV2CommandSchema estrito. Conta/run/mercado derivam da sessão e dos pins internos. Autoriza novamente depois de lock do mercado e dos runs, antes de consultar recibos. Bloqueia sessão revogada e acesso desabilitado, inclusive replay. Contrapartes de negociação devem continuar admitidas; suspensão/evento/fechamento são revalidados pelo escritor. Lock mercado→runs ordenados; callbacks não adquirem lock da autoridade de eventos. Relógio é amostrado após locks e limitado pelo cursor do livro. Backlog R7 confirma somente parcela de progresso e não executa a intenção financeira; nova decisão exige novo ID/revisão.

GET state permanece REPEATABLE READ READ ONLY para economia. Só projeta mercado fixado; troca IDs privados de run por IDs públicos de conta, restringe ofertas e histórico às partes e oculta anúncios de vendedores desabilitados/suspensos. Expiração é projetada com relógio do servidor sem criar presença, liquidar farm ou gravar no livro. Toda mutação verifica prazo novamente.

## Interface e recuperação

Mais→Ensaio online v2→Mercado online v2 de teste. Anunciar equipamento/material; preço e quantidade até três casas decimais convertidos com BigInt; busca, filtros e páginas de20anúncios; comprar, ofertar, retirar/aceitar/recusar, cancelar, resgatar e histórico próprio até50transações. Revisão explícita identifica o bem e mostra preço/imposto/líquido e custo de anúncio antes de confirmar; texto externo usa textContent.

Comando financeiro é salvo em sessionStorage por conta antes do envio; resposta perdida/recarga reenvia o mesmo UUID e payload. Recibo aplicado/rejeitado/settling encerra a intenção. Stale não cria nova compra automática; exige revisar e confirmar novamente. Durante resultado desconhecido, demais mutações ficam bloqueadas. Sem saldo/item otimista, dados legados importados ou concessões pela interface. HTTP sem pin não permite negociar.

## Validação exigida

Testes SQL isolados: identidade/CSRF/flags, roster/pin, concorrência/replay/hash, revogação durante espera, DTO/projeção expirada sem escrita, ofertas/fundos, cancelamento/resgate/cooldown, evento/suspensão/desabilitação, backlog e rollback integral da outbox/ledger/fee/receipt. Browser dev/preview, desktop/mobile, ida/volta da mesma instância, todas as ofertas, resposta perdida com reload, resgate/expiração e carteira legada preservada. Regressões V13 e auditorias/replays V10/V11/V12 mantidos.

Sem alteração de fórmulas, fontes, taxas ou artefatos certificados de campanha/liquidez/população. Arena/guilda/temporadas autenticadas, capacidade/retenção, calibragem Coin/Força/HP/Jade, corte/backup/rollback e playtest continuam pendentes. Economia real/+16–20/monetização off.

## Preparar o playtest

Com DATABASE_URL apontando para o mesmo banco isolado da V13 e o roster de eventos já vinculado:

1. Executar build e migrações usuais: `npm run build` e `npm run db:migrate -w @akai/server`.
2. Preparar um arquivo privado com o array dos mesmos2–20UUIDs de run da autoridade de eventos. Não publicar esse arquivo.
3. `node apps/server/dist/market-v2-cli.js stage --file private-run-ids.json --request UUID`.
4. Usar o ID de mercado retornado: `node apps/server/dist/authenticated-v13-cli.js bind-market --realm MARKET_UUID`.
5. Manter as flags de teste V13 explicitamente configuradas no ambiente isolado e iniciar `servidor.bat`. Entrar com conta já admitida e abrir Mais→Ensaio online v2→Mercado online v2 de teste.

Repetir bind para o mesmo mercado é idempotente; outro mercado/roster é recusado. O comando não cria saldo, run, equipamento ou participante. Permissões temporárias continuam em enable/disable --account UUID da CLI V13. O mercado legado e o ensaio têm destinos distintos e nunca somam saldos.

## Fechamento

Candidato `000ed61d0fbd07d49e7760d8ee6aff8cc0f035a4`, árvore `afdee3e56447fdaf082fb6c8687a93dd1eea90ec`, [PR24](https://github.com/marmitero/projeto-akai/pull/24). [CI39810570092](https://github.com/marmitero/projeto-akai/actions/runs/39810570092) e [Windows39810570094](https://github.com/marmitero/projeto-akai/actions/runs/39810570094). aprovadas:316testes/36arquivos PostgreSQL16 sem skips,13SQL novos,19Node, auditorias/replays e browser dev/preview desktop/mobile completos. Windows BAT/LAN aprovado. Evidências, falha inicial de fixture corrigida e limites em [RESULTS.md](RESULTS.md). Fechamento posterior somente documental, sem alterar o candidato validado.
