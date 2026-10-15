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

Histórico: a entrega documental inicial tinha pausa explícita. Em 15/10/2026 o usuário autorizou a próxima etapa, F1 de fundação técnica, sem contratar serviços nem publicar aplicativo. Novas etapas seguem o escopo autorizado e as regras de autonomia/encerramento; não interpretar a pausa anterior como proibição permanente de desenvolver.

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

## Autonomia e encerramento de etapas — regra do usuário (15/10/2026)

O agente decide pendências técnicas, artísticas e de design dentro do escopo aprovado, desde que não impliquem decisão financeira crucial nem alteração muito rigorosa do produto. Não solicitar validação de rotina para escolhas reversíveis. Essa delegação não autoriza iniciar uma fase que o usuário mandou aguardar nem contratar/pagar/publicar comercialmente sem escopo correspondente.

Ao final de **toda etapa**:

1. Atualizar AI_STATE, ROADMAP e os documentos afetados; preservar evidências e distinguir feito, parcial e pendente.
2. Listar no chat decisões tomadas autonomamente, com breve motivo quando relevante.
3. Listar no chat pendências que exijam validação, indicando quem decide, por quê e quando bloqueiam. Se não houver, declarar que não há validação necessária.
4. Nas questões reservadas ao usuário, preparar antes uma recomendação concreta, opções/custo/impacto e perguntar apenas o indispensável. Não transformar pendências de fases futuras em bloqueios da fase atual.

Reservado ao usuário: gastos/compromissos financeiros relevantes, preços reais/modelo de monetização de impacto material, identidade/contas/aceites que só o titular pode realizar e mudanças profundas das regras já estabelecidas. O agente pesquisa/projeta/implementa o restante dentro do trabalho autorizado, incluindo parâmetros de moeda virtual, com simulação e registro quando aplicável. Licenças não comprovadas não podem ser declaradas liberadas: investigar origem, usar alternativas permitidas e pedir comprovante ao titular somente quando necessário.

Regra adicional do usuário (15/10/2026): todo encerramento também informa **o que foi feito**, **se a etapa está completa ou o que falta**, e **o próximo passo recomendado**, além de decisões e pendências de validação.
