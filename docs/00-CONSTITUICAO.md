# Constituição do Projeto Akai

Versão 1 — 15/10/2026. Base: Master Prompt e alteração de navegação aprovada pelo usuário. Documento normativo; a existência desta especificação não significa implementação.

## Visão e público

RPG idle clicker de fantasia medieval, 2D lateral, para sessões curtas e retorno frequente. Prioridade: celular vertical no navegador; desktop com composição vertical; Android em fase posterior. O jogador combina mineração ativa, automação e fortalecimento do herói para vencer uma torre de 1.000 andares planejados.

## Pilares e invariantes

- Três telas independentes: Batalha, Mina e Produção, com HUD inferior persistente junto a Mochila, Loja e Mais. Nunca recombinar em três faixas empilhadas.
- Combate automático, mineração manual de ferro e minas automáticas de carvão, ouro e jade. Trocar de tela não pausa o domínio nem concede progresso offline.
- Andar comum: três ondas de três inimigos, nove no total, sem limite de tempo. Múltiplos de dez: uma onda com um boss e tempo limitado. Falha retorna ao andar anterior e pausa progressão até nova tentativa manual.
- Ferro inicial: um por clique, antes de bônus. Ouro exige mina de carvão nível 50. Jade é o nome oficial, não Diamante.
- Sprites reais do acervo, animações e leitura lateral. Preservar originais e rastrear derivados. Nenhuma imagem ilustrativa substitui os assets já disponíveis sem razão registrada.
- Online: recursos, combate, drops e resultados competitivos são validados pelo servidor. Local é ambiente de desenvolvimento, separado da economia online.
- Dados críticos exigem persistência, idempotência e recuperação. Nunca declarar compra, mercado ou monetização concluídos por haver apenas um botão.

## Escopo e entregas

O produto completo mantém equipamentos, mascotes, habilidades, fabricação, eventos, boss global, anúncios voluntários, loja, mercado, PvP, guildas e rankings. A primeira fatia local limita conteúdo para validar o loop, sem apagar o restante: [MVP](MVP_ACCEPTANCE.md) e [Roadmap](ROADMAP.md).

Nesta entrega, a instrução explícita é **somente documentação e aguardar**. Ela prevalece sobre a orientação genérica do Master Prompt para avançar automaticamente à implementação. Não criar código do jogo, instalar stack, provisionar serviços ou publicar aplicativo nesta etapa.

## Hierarquia documental

1. Instrução explícita mais recente do usuário para o trabalho atual.
2. Esta Constituição, para regras de produto aprovadas.
3. [Master Prompt](master-prompt.md), como especificação de intenção e escopo.
4. ADRs aceitos e documentos de domínio, para detalhamento compatível.
5. Parâmetros provisórios de balanceamento e contratos propostos.
6. Código implementado não substitui silenciosamente uma regra documentada.

Se Constituição e Master Prompt divergirem sem decisão explícita, registrar em DECISIONS e suspender somente a escolha conflitante. AI_STATE registra estado, não tem poder de alterar regras.

## Regras econômicas, monetização e privacidade

Coins, ferro, carvão, ouro, jade e ruby têm identidade separada. Compras reais, anúncios e transferências precisam de validação confiável, auditoria e concessão única. Sem anúncios inesperados ou obrigação de assistir para continuar. Sem transferência de dinheiro real entre jogadores. Negociação de ruby fica desabilitada até revisão comercial/jurídica e de plataforma. Coletar somente dados necessários; nunca colocar tokens, recibos ou dados pessoais nos logs públicos.

## Limites e mudanças

Versões exatas da stack, hospedagem, provedor de identidade e SDKs serão verificadas quando a implementação for autorizada. Não inventar prazos, custos de nuvem ou capacidade de escala. Toda mudança fundamental registra motivo, alternativas, impacto em saves/economia/arte, documentos afetados e decisão em ADR. Números marcados provisórios podem ser ajustados por experimentos, mantendo histórico da configuração.

## Definição de pronto

Regra documentada, implementação integrada, testes relevantes executados, erros tratados, persistência correta, critérios de UX atendidos e AI_STATE atualizado com evidência. Plano escrito não é funcionalidade pronta. Licenças e aprovação visual são condições de lançamento, não presumidas pelo inventário técnico.
