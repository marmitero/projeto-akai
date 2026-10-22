# Fase 4 — consumidores autenticados (V13)

A implementação agora permite que sessões online autorizadas leiam e operem seus runs v2 no servidor de teste, compartilhando uma única autoridade de eventos. A economia real continua desativada. Produção pública, sharding e migração não estão aprovados.

## Entrega

- Cookie e conta autenticada determinam o run; rotas não recebem outra conta/sala/personagem. Consulta mostra somente a própria carteira, atributos/equipamentos e dados públicos do evento; sem seed/segredo/arquivo original ou carteiras alheias.
- Um realm canônico fixado pelo operador para todo o playtest1–20, sem reset ou seleção de salas pelo cliente. Duas sessões veem o mesmoHP, ranking e broadcast; não há uma escada nova de prêmios por navegador.
- Ações de evento e da própria economia usam os escritores SQL existentes e a mesma carteira/revisão/ledger. Revalidar sessão dentro da transação após locks, antes de replay de recibo; perda de resposta não duplica grants. Close administrativo e preços/dano/clock fornecidos pelo cliente são recusados.
- Interface Mais → Ensaio online v2, habilitada somente quando o servidor anuncia o teste. Participação/boss/proteção, torre/hunts, pausa, treino e processamento limitado com estados de erro e preço de atributos; presença somente com janela aberta e página visível.
- Toggle HTTP off por padrão e vedado em produção/origem pública. Exige banco explicitamente declarado de teste e mantém a conta legada separada. Não exporta run/realm no DTO externo; suas associações são resolvidas internamente.

## Limites preservados

A autoridade é única **neste deployment de ensaio**, limitada a20membros. Não é capacidade global para milhares, implementação de retenção de grants ou corte das contas reais. As PKs R8 continuam porrealm; o pin único impede multiplicar realms pelo consumidor HTTP, sem reformular o histórico privado existente. Outras coortes ainda são ferramentas privadas do operador e não são fontes públicas extras. Não habilitar rotas fora do banco isolado.

HP100milhões, regra de qualificação600s,3de participação, escada200–20 e último hit250 permanecem como naV12. +16–20 e monetização seguem off. A fase não resolve calibragem deHP/janela competitiva/Jade, Coin/mercado ou Força no final da torre; não remover esses gates. Mercado é leitura; comandos de negociação, arena, guilda e temporadas autenticados ficam para a etapa seguinte. A carteira legada continua funcionando independentemente enquanto o corte não for aprovado; nunca somar seus saldos aos do teste.

## Validação

Testes novos cobrem configuração fail-closed, propriedade da conta, DTO sem segredos, pin de uma autoridade, atividade exclusiva, ganho e gasto nativos, preço impossível recusado, morte concorrente, recibo idempotente/conteúdo divergente, revogação durante espera, rollback por outbox e ausência de rota quando desligada. Fixtures técnicas criam apenas contas sintéticas em schemas PostgreSQL isolados; não representam campanha/economia aprovada.

Smoke de navegador usa duas sessões e viewports desktop/mobile: ingresso real pela UI, uma morte/broadcast compartilhado, Jade privada após tempo de combate autoritativo, carteira Jade legada intacta e nenhuma chave privada/overflow. O relógio acelerado existe apenas no processo do teste; não é rota nem payload disponível ao cliente.

Local: tipos/check completo aprovado (169 testes e132PG omitidos antes do oitavo caso SQL), onze testes integrados anteriores também passaram isoladamente. Uma primeira rodada local teve timeout por carga no teste integrado legado; repetição dirigida e check completo passaram sem alterar esse teste ou ampliar seu limite. Campanhas V10, mercado V11 e população V12 foram reproduzidos sem mudança nos artefatos/fontes compartilhadas. A primeira CI passou os302testes comPostgreSQL16/sem skips e os replays, mas o novo smoke avançou o relógio20s sem renovar lease15s e o servidor recusou corretamente o heartbeat. Sequência do ensaio corrigida para renovar em10s antes dos avanços seguintes; cliente também refaz até3vezes somente heartbeat/sync/settle após revisão obsoleta, mantendo compras/treinos sem retry automático; runtime de presença preservado. Nova CI completa em execução; não declarar aprovação remota antes do fechamento.

## Sequência

1. Validar PostgreSQL/HTTP/browser e publicar esta etapa, mantendo flags off.
2. Completar consumidores autenticados de mercado/arena/guilda/temporadas em etapas delimitadas, usando a mesma identidade e carteira, sem reativar fontes antigas no v2.
3. Resolver janela competitiva/HP/Jade/refino e pendências deCoin/build; ampliar autoridade/retencão/capacidade com ensaio entre instâncias e orçamento de prêmios único.
4. Ensaio de corte/backup/reconciliação/rollback e playtest gratuito; depois revisão de ativação. Monetização por último.
