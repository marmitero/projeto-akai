# Relatório Fase 7 — mercado

15/10/2026. **Implementação, validação e publicação na main concluídas. CI remota F7 aprovada.** Base publicada F6: `7ac5583c348e0ad4c468ab0e582e5954fe5972ea`. Nenhum serviço contratado, pagamento ativado ou início da F8.

## Entregas

- Contratos strict `market-1`, migração aditiva003 e rotas autenticadas de leitura/comando, com filtros/paginação e privacidade de ofertas/histórico.
- Escrow real de equipamentos e quantidades de recurso; itens indisponíveis para equipar/melhorar/reciclar e recursos fora do saldo utilizável enquanto reservados.
- Compra direta e aceitação de contraoferta atômicas: saldo, item, taxa, vendedor, comprador, trade, ledger, outbox e resultado do comando confirmam juntos. Um trade por anúncio, sem compra própria.
- Anúncios72h, custo100milCoins sem reembolso, venda10% na própria moeda com ceil em milésimos, líquido positivo. Ofertas até24h sem reserva de dinheiro, revalidadas na aceitação.
- Cancelamento/expiração/remoção guardam o bem para resgate; mochila cheia ou teto de saldo impedem entrega sem perda ou débito. Procedência do equipamento preservada ao realocar ID local. Cooldown24h por procedência ou categoria inteira de recurso/conta contra split/merge.
- Auditoria e transações append-only, histórico privado, suspensão/rate limits e moderaçãoCLI com credencial operacional. Nenhuma rota admin pública ou concessão de saldo/item pelo cliente.
- Mais→Mercado online, usando sprites e molduras existentes, revisão prévia das operações, saldos exatos, filtros/categorias, anúncios próprios, resgate, ofertas e histórico. Pending em sessionStorage por conta recupera perda de resposta e reload com o mesmo UUID.

Apenas ativos elegíveis existentes: equipamentos e ferro/carvão/ouro/jade; preço em Coins ou esses recursos. Ruby permanece bloqueado por D15, Musgo é companheiro de conta, skins não têm instâncias implementadas. Não foram inventados ativos transferíveis para apresentar categorias futuras como concluídas. Mercado não é loja premium. Perfil local/jogar.bat e sprites originais preservados.

## Evidências locais

| Área | Evidência |
|---|---|
| Suíte completa | 117 testes em10arquivos (94anteriores+23F7), todos passaram com PostgreSQL real |
| Contratos/taxas | Ruby/payloadforjado/valores inválidos rejeitados; ceil/BigInt, conservação e moeda correta |
| Migração | Banco001/002→003 com conta/sessão/saldos preservados e reexecução sem perda |
| Concorrência |20replays de anúncio,16replays/duas compras, compra×oferta e cancelamento×compra: um resultado econômico |
| Escrow/retorno | Equipado/não existente não reserva; peça fora da mochila não equipa; prazo exato, restart, claim idempotente, mochila120, IDs sem colisão e cooldown contra split/merge |
| Falhas/economia | Sem saldo/overflow reverte; falha de outbox reverte ambos os perfis/trade/ledger/escrow; reconciliação ledger sem divergência nos cenários econômicos |
| Oferta/permissão | Retirada/recusa/aceitação, IDOR, fundos gastos após oferta, suspensão comprador/vendedor, TTL limitado ao anúncio |
| Operação | CLI real de remoção com motivo, auditoria imutável, Origin/CSRF/auth/rate limit e ausência de adminHTTP |
| Builds/arte | Typecheck, hashes dos90assets e builds passaram; nenhum sprite original modificado |
| Simulação | phase7-economy-simulation.json: pressão por estágio, arredondamento e100transações recíprocas sem geração de moeda |
| Navegador | Todos os oito smokes local/online/comunidade/mercado passaram em dev/preview |

Ambiente local: Node24.19, PostgreSQL nativo18.4 e Chromium153. Harness isolado do contêiner usa ajuste de UID para executar PostgreSQL; esse ajuste não integra o projeto/servidor. [CI F7 38823228249](https://github.com/marmitero/projeto-akai/actions/runs/38823228249) aprovada com PostgreSQL16, 117testes, simulações e oito smokes de navegador. [CI Windows 38823228224](https://github.com/marmitero/projeto-akai/actions/runs/38823228224) também aprovada com o BAT real.

## Decisões e limites

Mantidos parâmetros do prompt com simulação: custo de anúncio é alto no início (834vitórias individuais do andar10,15no100, ignorando tempo/derrotas/outros prêmios). Valores experimentais para desenvolvimento, sem alegação de equilíbrio comercial. Nova configuração será necessária se telemetria/playtest justificar ajuste; não editar transações históricas.

Lock social compartilhado e locks ordenados privilegiam integridade do primeiro piloto. Caps5000perfis/5000anúnciosativos,20pendências por vendedor,20ofertas por comprador; busca50/página, ofertas100/consulta, histórico50. Não é prova de escala, antifraude completo ou eliminação de contas alternativas. Sem novo soak30min, aparelho físico ou playtest humano de competição/mercado. [Regras](MARKET_SYSTEMS.md), [ADR-011](ADR/0011-market-escrow.md), [simulação](phase7-economy-simulation.json).

## Completude e próximo passo

F7 concluída e publicada na main, com validação local e CI remota próprias aprovadas. Antes de público permanecem hospedagem/Google real/TLS/banco/backups/retencão/privacidade/moderação humana/licenças/aparelhos/carga e validação econômica orgânica. Nenhuma decisão financeira do usuário bloqueia o desenvolvimento desta fase.

Após o fechamento, próxima fase recomendada: **F8 — preparação de monetização em sandbox**. Primeiro definir provedores/contas/credenciais de teste e contratos de validação; não ativar cobrança ou anúncios reais nem fixar preços financeiros unilateralmente. F8 ainda não iniciada.

[Evidência consolidada F7](phase7-validation.json), [mercado dev](phase7-browser-dev.json), [mercado produção](phase7-browser-preview.json), [captura](phase7-screenshots/market-history-390.png). DOM do mercado94→94 nos30ciclos, zero pageerrors. Artefatos F3–F6 históricos preservados; regressões novas constam na evidência consolidada F7.

## Publicação e CI remota

Publicação expressamente autorizada pelo usuário em15/10/2026. Implementação na main em `a190b725a3d5f07d37079ea283be983b40a0327a`, árvore `1c2b4667082756883908523c824e7ac96cfb90fc` verificada idêntica à validada localmente. [CI F7 38823228249](https://github.com/marmitero/projeto-akai/actions/runs/38823228249) e [CI Windows 38823228224](https://github.com/marmitero/projeto-akai/actions/runs/38823228224) concluídas com sucesso. Nenhuma validação obrigatória ou autorização de publicação pendente nesta entrega. Gates públicos permanecem os registrados acima.
