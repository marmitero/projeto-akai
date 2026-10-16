# Relatório Fase 8 — monetização técnica de teste

15/10/2026. **Base técnica implementada e validada localmente. Gate externo da F8 parcial: Google Play/AdMob nas contas do titular ainda não exercitados. Publicação autorizada e realizada em16/10/2026; CI aprovada após correção de corrida na sincronização da loja.** Base remota F7:`3ccfdc436706f77fbc6ba7aa8ac12206a5b63ac3`. Sem compra real, anúncio real, preço financeiro, contratação ou início da F9.

## Entregas

- Contratos `monetization-test-1`, catálogo de quatro pacotes experimentais de Ruby e entitlement de título cosmético sem atributos. Loja integrada com sprites existentes, sem preço real definido.
- Modos off/sandbox/google-play-test. Off padrão; testes exigem loopback, chave privada e declaração de banco separado. Marcador persistido impede promover banco com saldos de teste ao modo normal. Nenhum modo financeiro de produção.
- PurchaseProvider separado do domínio; emulador local com recibos HS256 assinados e estado autoritativo próprio. GooglePlayTestProvider consulta ProductPurchaseV2 via OAuth de service account, valida contextoTEST/conta/SKU/quantidade e usa consume/acknowledge após concessão.
- Recibos cifrados AES-GCM/hash único, concessões/transações imutáveis, ledger/outbox atômicos, idempotência e privacidade. Pagamentos pendentes não concedem; fonte só credita uma vez.
- Recuperação de resposta perdida/reload, restore, fila persistente pós-commit, backoff por recibo e reconciliação de estado. Uma falha do provedor não paralisa outros recibos.
- Estorno e revogação por fonte: Ruby disponível até zero, dívida se gasto, abatimento por compra posterior; título removido sem alterar atributo. Sem editar concessão histórica.
- Quatro recompensas voluntárias: autoclick3/s por120s;120s de Coins/XP torre2×;120s de dano torre2×;Coins conforme andar. Cooldown5min,8solicitações/24h, sem empilhar, presença confiável e expiração por instante do golpe. Sem efeito em arena/boss global/guerra ou cliques/combate offline.
- Verificador puro AdMob SSV ECDSA DER/query bruta com chaves de fixture. Ele não concede nada sozinho, não instala callback/SDK/rotação nem comprova anúncio externo.
- CLI operacional de estado do simulador com motivo/auditoria. Default local/jogar.bat preservado; nenhum serviço ou saldo premium ativado silenciosamente.

## Evidência local e seu alcance

| Área | Resultado |
|---|---|
| Suíte completa |143testes/12arquivos:117anteriores+26F8, PostgreSQL real |
| Migração | Schema F7 real001–003→004, conta/sessão/saldos preservados, reexecução idempotente |
| Contratos/crypto |Payloads arbitrários/booleanos/recibos falsos rejeitados; AES-GCM autenticado; SSV DER/raw query com chave confiável de fixture |
| Google backend |Mock HTTP de OAuth/API oficial testa contextoTEST, quantidade, cancelamento/pendência, consume/acknowledge e indisponibilidade. **Não é chamada real ao Google** |
| Concorrência |20replays de comando e5novosUUIDs usando mesmo recibo: uma fonte/um crédito; conta/SKU incorretos rejeitados |
| Recuperação |Resposta perdida antes/depois da verificação, restart, restore sem duplicação, ack indisponível e backoff por recibo com outras entregas continuando |
| Estorno |Revogação única, Ruby parcialmente gasto/dívida, compra abatendo dívida, cosmético removido e ledger conciliado |
| Rollback |Falha de outbox reverte snapshot, compra, grant e ledger; mesmo comando recupera após retirar falha |
| Bônus |Tempo mínimo5s do simulador, TTL, cooldown/janela24h, replay,3/s sem erro de frequência, nenhum cliqueoffline, golpe no instante de expiração sem bônus |
| Segurança/operação |Origin/CSRF/auth/suspensão, defaultoff sem rota simuladora, isolamento de banco/modo e histórico imutável |
| Builds/arte |Typecheck, builds e hashes dos90assets passaram; sprites originais preservados |
| Navegador |10smokes: local, online, comunidade, mercado e premium dev/preview; todos passaram |
| Interface premium |Duas contas isoladas, perda de resposta+reload, restauração, título persistido/cabeçalho, autoclickvalidado,30navegações,320/390/768px; DOM75→75 e zero pageerrors |

[Simulador dev](phase8-browser-dev.json), [preview de produção](phase8-browser-preview.json), [parâmetros simulados](phase8-economy-simulation.json), [captura](phase8-screenshots/premium-sandbox-390.png). “Preview de produção” é bundle Vite otimizado usando **banco e provedor simulados de teste**, não build pública monetizada.

Ambiente local: Node24.19, PostgreSQL nativo18.4, Chromium153. O harness externo ao repositório ajusta UID do contêiner para rodar PostgreSQL; CI está configurada com PostgreSQL16. Não houve nova execuçãoWindows, soak30min, aparelhoAndroid físico, teste de escala, playtest econômico humano ou homologaçãoGoogle/AdMob nesta etapa. Runs F7 permanecem históricos, não prova de CI F8.

## Decisões autônomas

Preservados alvos Google Play/AdMob do prompt, com isolamento explícito e falta de credenciais/cliente nativo tratada como dependência. Quantidades100/550/1200/2600Ruby são testes sem preço; título cosmético exercita não consumível sem poder. Não foram inventados preços, bônus permanentes competitivos, Ruby negociável/conversões ou baús pagos para aparentar catálogo completo. Caps/cooldowns propostos receberam simulação determinística, sem alegar equilíbrio comercial. Regras completas em [MONETIZATION_SYSTEMS](MONETIZATION_SYSTEMS.md)/[ADR-012](ADR/0012-monetization-test-boundary.md).

## Pendências e responsáveis

| Pendência | Responsável e impacto |
|---|---|
| Publicação da base técnica | Autorizada em16/10/2026; implementação089aa10 e correção c007562 publicadas, CI aprovada |
| Package/app/produtos/license testers e acesso da service account | Titular configura no Play Console e fornece ao ambiente por canal privado, sem colocar chave no chat/Git; bloqueia teste Google real |
| Checkout/query de compras nativas | Implementação Android na F9 ou cliente de teste equivalente; necessário para receber tokens reais de licença-teste |
| Unidade/conta AdMob, SDK/SSV e configuração de chaves/consentimento | Titular e integração nativa; bloqueia anunciar validação externa de anúncio |
| Preços reais e produtos com poder permanente/conversão premium | Decisão financeira/material do usuário, após proposta/análise; **não bloqueia código de teste desligado** |
| Público, políticas/privacidade, licenças, operação e aparelhos | Gates de lançamento; sem declaração de conformidade comercial nesta entrega |

## Completude e próximo passo

**Concluído:** base técnica F8 e seu simulador local verificável, com regressões anteriores preservadas. **Ainda parcial:** gate de integrações efetivas de teste nas contas dos provedores. Não chamar a F8 externa de homologada apenas por testes locais/mocks.

Decisão atual do usuário em16/10/2026: adiar a integração/ativação de monetização até a fase final e priorizar polimentos. Todas as pendências externas, decisões comerciais e gates estão preservados em [MONETIZATION_DEFERRED](MONETIZATION_DEFERRED.md). Próximo trabalho: [POLISH_PLAN](POLISH_PLAN.md). A F9 continua não iniciada e não houve ativação comercial.

[Evidência consolidada F8](phase8-validation.json) preserva os resultados novos das regressões sem sobrescrever os artefatos históricos F3–F7.

## Publicação autorizada em16/10/2026

Base publicada na `main` em `089aa10a06c6190e595ffd2cf0f0335b8e758093`. A [primeira CI](https://github.com/marmitero/projeto-akai/actions/runs/38884448935) expôs um clique perdido quando a simulação coincidiu com o GET periódico da loja. Corrigido em `c007562fcbf0f5141804175c168df7f9b1c732af`: guardar a intenção explícita durante sincronização e executá-la ao concluir a leitura, cancelando a fila ao sair da tela. O smoke agora bloqueia o GET deliberadamente e verifica a concessão, sem depender de um atraso aleatório. Desenvolvimento e preview locais passaram.

[CI de revalidação](https://github.com/marmitero/projeto-akai/actions/runs/38885813053): aprovada (143testes e10smokes dev/preview). [Windows/jogar.bat](https://github.com/marmitero/projeto-akai/actions/runs/38885812976): aprovado. Essas execuções pertencem à própria F8; os números de fases anteriores permanecem históricos. A monetização segue desligada por padrão. Publicação de código não significa hospedagem pública nem ativação dos provedores.
