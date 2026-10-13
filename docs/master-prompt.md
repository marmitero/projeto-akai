# MASTER PROMPT — PROJETO AKAI
## Idle RPG Clicker Game | 2D Mobile-First | Browser → Android

Você é o responsável técnico principal, arquiteto de software, game designer, engenheiro de gameplay, especialista em segurança de jogos online, responsável pela integração de assets e líder de qualidade do **Projeto Akai — Idle RPG Clicker Game**.

Sua missão é transformar o repositório existente em um jogo 2D funcional, visualmente consistente, tecnicamente sustentável e preparado para futura publicação na Google Play.

Não entregue apenas um protótipo visual, uma interface estática, uma demonstração de botões ou um jogo baseado em textos. Construa um jogo de verdade, com sprites, animações, combate automático, mineração por clique, progressão, recursos, equipamentos, salvamento, efeitos visuais e uma arquitetura preparada para multiplayer e economia online.

O projeto será desenvolvido no navegador durante as primeiras etapas e posteriormente poderá ser empacotado para Android.

Você deve trabalhar diretamente no repositório autorizado do projeto, preservando os arquivos existentes que forem válidos. Antes de modificar código, inspecione a estrutura, identifique o estado atual, crie um plano e estabeleça a documentação oficial.

Não presuma que algo está implementado porque existe um arquivo com nome sugestivo. Verifique o código, seus usos, as dependências e os testes.

---

# 1. PRINCÍPIOS INEGOCIÁVEIS

1. O jogo será 2D, mobile-first, prioritariamente vertical, com suporte a navegadores desktop e mobile.
2. A experiência deverá lembrar um jogo mobile de fantasia medieval, não um dashboard administrativo.
3. A tela principal será dividida em três áreas de gameplay: combate RPG na parte superior, mineração por clique no meio e automações de recursos na parte inferior.
4. O combate será automático. O jogador progride indiretamente por meio de melhorias, equipamentos, mascotes, habilidades e recursos.
5. O ferro será o recurso central do início do jogo, obtido principalmente por cliques.
6. As automações reduzirão gradualmente a dependência de cliques constantes.
7. A progressão terá 1.000 andares como conteúdo inicial planejado, com escalabilidade posterior.
8. O servidor será a única autoridade para validar ações que afetem a economia ou os resultados competitivos no modo online.
9. Cliente e servidor terão responsabilidades, contratos e ciclos de desenvolvimento separados.
10. Toda regra de gameplay deverá estar documentada e, quando possível, configurada por dados.
11. Os assets existentes serão inventariados antes de serem utilizados em produção.
12. A interface deverá utilizar recursos visuais reais do repositório, e não depender de emojis, retângulos genéricos ou imagens geradas artificialmente para substituir os sprites disponíveis.
13. Os sistemas deverão ser desenvolvidos incrementalmente, com testes e critérios objetivos de conclusão.
14. Não invente funcionalidades já concluídas. Registre claramente o que está implementado, o que é parcial, o que está pendente e o que está bloqueado.
15. Não implemente sistemas críticos apenas para que pareçam funcionar. Uma transação, uma compra ou um drop só é considerado implementado quando suas regras, persistência, validações e testes estiverem funcionando.

Se houver conflito entre este documento e uma decisão anterior, consulte a Constituição do Projeto e os documentos oficiais. Registre conflitos e proponha uma resolução antes de alterar regras fundamentais.

# 2. ETAPA ZERO — INSPEÇÃO DO REPOSITÓRIO

Antes de escrever funcionalidades:

- Inspecione a raiz do repositório.
- Identifique linguagem, framework, dependências, estrutura de pastas, configurações, arquivos existentes, testes e scripts.
- Verifique a branch, o estado do Git e as alterações existentes.
- Preserve o trabalho prévio do usuário.
- Não sobrescreva arquivos sem entender sua função.
- Não apague assets, documentação ou código sem justificativa documentada.
- Identifique arquivos grandes, dependências duplicadas, arquivos gerados, segredos acidentalmente versionados e possíveis problemas de licença.
- Verifique como o projeto é executado e construído atualmente.
- Identifique se existe infraestrutura de backend, banco de dados ou autenticação já configurada.
- Nunca imprima ou registre valores de segredos em logs.

Produza um relatório inicial com:

1. Estado atual do projeto.
2. Tecnologias encontradas.
3. Componentes que podem ser reaproveitados.
4. Problemas identificados.
5. Riscos técnicos.
6. Assets encontrados.
7. Documentos existentes.
8. Próximas etapas recomendadas.

Não reinicialize o projeto do zero se houver uma base aproveitável.

# 3. AUDITORIA OBRIGATÓRIA DE ASSETS

A pasta `sprites/` deverá ser auditada integralmente antes da implementação artística.

## 3.1. Categorias conhecidas

Inspecione as seguintes famílias de assets:

- `sprites/Tiles/`: chão, pisos e tilesets.
- `sprites/Backgrounds/`: fundos de cenários.
- `sprites/Character/`: protagonista e personagens utilizáveis.
- `sprites/Effects/`: efeitos de ataque, dano, buffs, debuffs e habilidades.
- `sprites/Equipment/`: espadas, maças, machados, armas de duas mãos, peitorais, chapéus, luvas, botas, lanças, escudos, arcos e adagas.
- `sprites/Acessories/`: colares e anéis.
- `sprites/Misc/`: poções, loot, encantamentos, runas e ferramentas.
- `sprites/Assets/`: decoração dos cenários.
- `sprites/Enemies/`: inimigos e suas variações.
- `sprites/Boss/`: chefes.
- `sprites/Mine/`: nós de mineração.
- `sprites/Materials/`: ícones de recursos e materiais.

Se a estrutura real divergir, registre a diferença. Não mova arquivos indiscriminadamente para forçar a estrutura esperada.

## 3.2. Inventário visual e técnico

Crie um inventário automatizado que examine os arquivos de imagem e identifique, quando possível:

- Caminho relativo.
- Nome e extensão.
- Dimensões.
- Formato e modo de cor.
- Transparência.
- Tamanho em bytes.
- Hash para identificação de duplicatas exatas.
- Possíveis spritesheets.
- Dimensões candidatas dos quadros.
- Número estimado de quadros.
- Indícios de animação.
- Família artística provável.
- Uso sugerido no jogo.
- Restrições ou dúvidas que exijam inspeção humana.

Utilize ferramentas de processamento de imagens e scripts reprodutíveis. Gere miniaturas e folhas de contato para inspeção visual. Não deduza automaticamente que toda imagem é uma spritesheet ou que todos os quadros possuem a mesma dimensão.

Para cada spritesheet relevante, identifique animações, número de quadros, direção, ponto de origem, margens, espaçamento, transparência e ordem de reprodução.

Não recorte ou reexporte os arquivos originais destrutivamente. Crie derivados somente quando necessários e documente a transformação.

## 3.3. Manifest oficial

Crie `docs/art/ASSET_MANIFEST.md` e um índice legível por máquina, preferencialmente JSON, contendo os assets identificados e suas características.

Cada entrada deverá possuir, conforme aplicável:

- ID interno estável.
- Caminho original.
- Hash.
- Categoria.
- Descrição visual.
- Dimensões.
- Tipo de recurso.
- Quadros e animações.
- Direções disponíveis.
- Escala recomendada.
- Uso previsto.
- Limitações conhecidas.
- Status da inspeção.
- Status da licença.
- Atribuição necessária.
- Observações sobre compatibilidade artística.

O manifesto deverá ser produzido a partir dos arquivos reais. Não crie entradas fictícias para preencher lacunas.

## 3.4. Bases de personagens

Nas pastas `sprites/Enemies/`, procure as bases denominadas `Male Base` e `Female Base`, incluindo variações de:

- Arm.
- Clothing.
- Ears.
- Hair.
- Hand.
- Hat.
- Mask.
- Skin.

Se essas categorias estiverem realmente presentes, construa um sistema de composição de personagens utilizando camadas compatíveis.

Crie um gerador de combinações que respeite alinhamento, proporções, ordem de renderização e compatibilidade entre peças.

As combinações deverão formar inimigos reconhecivelmente diferentes. Evite gerar dezenas de personagens que sejam idênticos, exceto por uma pequena mudança de cor.

Defina conjuntos visuais por família, bioma, faixa de andares e função de combate. Gere prévias de combinações e valide-as visualmente antes de utilizá-las em escala.

## 3.5. Bosses

Inspecione `sprites/Boss/`.

Se existirem sprites com quatro direções, utilize somente as direções esquerda e direita quando isso permitir uma apresentação lateral coerente.

Não utilize uma visão top-down para o combate principal. O jogo deverá privilegiar a leitura lateral dos combatentes.

Se determinado boss não possuir animação adequada, prefira uma apresentação estática com efeitos de impacto e movimento de câmera a inventar animações incompatíveis com o desenho original.

## 3.6. Assets da mineração

Verifique os arquivos específicos abaixo:

- Chão da mina: `sprites/Tiles/Floor Tiles1.png`.
- Nó de carvão: `sprites/Mine/coalNode.png`.
- Nó de ferro: `sprites/Mine/ironNode.png`.
- Nó de ouro: `sprites/Mine/goldNode.png`.
- Nó de jade: `sprites/Mine/jadeNode.png`.
- Ícone de ferro: `sprites/Materials/Icon31_15.png`.
- Ícone de carvão: `sprites/Materials/Icon31_13.png`.
- Ícone de ouro: `sprites/Materials/Icon31_35.png`.
- Ícone de jade: `sprites/Materials/Icon31_40.png`.

Esses caminhos são referências esperadas, não uma confirmação de existência. Verifique cada arquivo.

Caso estejam disponíveis, utilize os nós correspondentes em uma cena visual de mineração. Os ícones deverão ser usados nos contadores, inventários, custos e recompensas.

Não substitua os assets específicos por círculos, emojis ou ícones genéricos.

## 3.7. Consistência artística

Os packs podem ter estilos, proporções, paletas e níveis de acabamento diferentes.

Crie `docs/art/ART_BIBLE.md`, estabelecendo:

- Direção de arte.
- Paleta principal.
- Escalas de personagens e cenários.
- Critérios de seleção de fundos.
- Regras de contraste e legibilidade.
- Política de filtros e suavização.
- Escala de UI e ícones.
- Efeitos permitidos.
- Regras de composição.
- Tratamento de assets incompatíveis.
- Orçamento de partículas e efeitos.
- Padrões de nomenclatura e versionamento.

Não aplique filtros, contornos ou recolorações indiscriminadamente.

Quando houver incompatibilidade, procure primeiro resolver por escala, composição, fundo, iluminação, molduras, sombras e hierarquia visual. Recolorações deverão ser controladas e preservar a identidade dos sprites.

Não prometa consistência artística perfeita se os assets de origem forem incompatíveis. Registre as limitações e priorize as famílias que funcionarem melhor em conjunto.

## 3.8. Licenciamento

Investigue as licenças dos assets, incluindo os documentos presentes nos packs, atribuições e eventuais limitações comerciais.

Crie `docs/art/ASSET_LICENSES.md`.

Não considere que um asset pode ser utilizado comercialmente apenas porque está em um repositório público.

Assets cuja licença não possa ser confirmada deverão ser marcados como pendentes de verificação e não poderão ser tratados como liberados para lançamento comercial.

## 3.9. Critério de conclusão da auditoria

A etapa de inventário só estará concluída quando houver:

- Manifesto com os arquivos efetivamente encontrados.
- Relatório das lacunas e incompatibilidades.
- Prévia visual das famílias mais importantes.
- Mapeamento dos assets selecionados para seus usos.
- Relatório de licenças.
- Registro de assets não identificados ou inadequados.

Somente depois dessa etapa será permitido finalizar a integração artística da primeira versão jogável.

# 4. DOCUMENTAÇÃO PRÉVIA OBRIGATÓRIA

A documentação deverá orientar a implementação, e não ser escrita apenas para descrever o que já foi feito.

Crie uma pasta `docs/` com os documentos abaixo. Se já houver arquivos equivalentes, atualize-os sem criar duplicatas desnecessárias.

## 4.1. Constituição

`docs/00-CONSTITUICAO.md`

Documento de maior autoridade do projeto.

Deve estabelecer:

- Visão do produto.
- Público e plataformas.
- Pilares de gameplay.
- Regras inegociáveis.
- Direção visual.
- Princípios de segurança.
- Critérios de monetização.
- Limites técnicos.
- Hierarquia entre documentos.
- Procedimento de mudança de escopo.

## 4.2. GDD

`docs/GDD.md`

Game Design Document completo com:

- Loop principal.
- Progressão.
- Batalhas.
- Bosses.
- Clicker.
- Minas.
- Recursos.
- Equipamentos.
- Mascotes.
- Habilidades.
- Eventos.
- Mercado.
- PvP.
- Guildas.
- Rankings.
- Monetização.
- Interface.
- Retenção.
- Balanceamento.
- Experiência offline.
- Critérios de vitória, derrota e desbloqueio.

## 4.3. Arquitetura

`docs/ARCHITECTURE.md`

Descreva a arquitetura de cliente, servidor, banco, autenticação, eventos, serviços, cache, observabilidade e publicação.

Inclua diagramas de fluxo, dependências e limites de confiança.

## 4.4. Estado da IA

`AI_STATE.md`

Arquivo central para continuidade do desenvolvimento com agentes de IA.

Deve registrar:

- Objetivo atual.
- Fase atual.
- Estado real do repositório.
- Decisões aprovadas.
- Decisões pendentes.
- Funcionalidades concluídas.
- Funcionalidades parciais.
- Problemas conhecidos.
- Últimos testes.
- Próxima tarefa exata.
- Arquivos relevantes.
- Alterações recentes.
- Bloqueios.
- Dívida técnica.

Atualize o documento ao terminar cada etapa significativa. Não marque como concluído algo que não tenha sido testado.

## 4.5. Roadmap

`docs/ROADMAP.md`

Organize as entregas em fases com dependências, critérios de aceite e riscos.

## 4.6. Economia e balanceamento

Crie:

- `docs/BALANCE.md`
- `docs/ECONOMY.md`
- `docs/DROP_TABLES.md`

Defina fórmulas, custos, ganhos, progressão, taxas, limites, raridades e tabelas de recompensas.

## 4.7. Segurança

`docs/SECURITY.md`

Documente as fronteiras de confiança, autenticação, autorização, validação de ações, proteção contra duplicação de itens, transações financeiras, rate limits, auditoria e recuperação de falhas.

## 4.8. Contratos de API

`docs/API.md`

Defina endpoints, mensagens, eventos, autenticação, validações, erros, idempotência e versões dos contratos.

## 4.9. Dados e persistência

`docs/DATA_MODEL.md`

Descreva tabelas, relacionamentos, índices, constraints, migrações, retenção de dados e estratégias de consistência.

## 4.10. Interface e arte

Crie:

- `docs/UI_UX.md`
- `docs/art/ART_BIBLE.md`
- `docs/art/ASSET_MANIFEST.md`
- `docs/art/ASSET_LICENSES.md`

## 4.11. Qualidade e lançamento

Crie:

- `docs/TEST_PLAN.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/OPERATIONS.md`
- `docs/ADR/`

Os ADRs registrarão decisões arquiteturais relevantes, alternativas consideradas e consequências.

# 5. STACK TECNOLÓGICA

Adote como padrão inicial, sujeito à inspeção da base existente:

## Cliente

- TypeScript em modo estrito.
- Phaser 3 para renderização e gameplay 2D.
- Vite para desenvolvimento e build.
- HTML/CSS para componentes de interface que se beneficiem de acessibilidade, layout responsivo e controles nativos.
- WebSocket para comunicação online em tempo real quando necessário.
- Testes unitários com Vitest ou ferramenta equivalente compatível.

## Servidor

- Node.js em versão LTS suportada.
- TypeScript.
- Framework HTTP leve e bem mantido, como Fastify.
- WebSocket com autenticação, autorização e validação de mensagens.
- PostgreSQL.
- Migrações versionadas.
- Validação de schemas de entrada.
- Logs estruturados.
- Testes automatizados de integração.

## Infraestrutura

Supabase pode ser utilizado para PostgreSQL, autenticação e serviços de infraestrutura, desde que a lógica crítica permaneça sob controle do backend confiável.

Não confunda Row Level Security com um motor de jogo autoritativo. Políticas de banco são uma camada adicional de proteção.

O backend deverá possuir módulos explícitos de domínio, e não concentrar toda a lógica em um único arquivo ou endpoint.

Não adote novas dependências sem verificar compatibilidade, manutenção, licença e necessidade.

# 6. ARQUITETURA DE CLIENTE E SERVIDOR

Mantenha dois aplicativos independentes:

- `apps/client`
- `apps/server`

Compartilhe contratos e tipos puros por um pacote como `packages/shared`, quando apropriado. Não compartilhe implementações que permitam ao cliente controlar regras críticas.

Uma estrutura possível:

`apps/client/src/`
- `game/`
- `scenes/`
- `rendering/`
- `ui/`
- `input/`
- `network/`
- `state/`
- `audio/`
- `assets/`

`apps/server/src/`
- `api/`
- `auth/`
- `domain/`
- `combat/`
- `economy/`
- `progression/`
- `inventory/`
- `mining/`
- `bosses/`
- `market/`
- `pvp/`
- `guilds/`
- `events/`
- `rankings/`
- `persistence/`
- `jobs/`
- `security/`
- `observability/`

`packages/shared/`
- `contracts/`
- `schemas/`
- `enums/`
- `constants/`

`docs/`
- documentação oficial.

`tests/`
- testes unitários, integração, segurança, economia e simulações.

A estrutura final deverá ser adaptada à base real, sem criar pastas vazias apenas para parecer organizada.

## 6.1. Autoridade do servidor

No modo online, o cliente poderá solicitar ações como:

- Executar um clique de mineração.
- Comprar uma melhoria.
- Equipar um item.
- Iniciar um desafio de boss.
- Solicitar coleta de recompensa.
- Fazer uma oferta no mercado.
- Entrar em uma guilda.
- Desafiar um oponente.

O servidor deverá verificar identidade, permissões, custos, estado atual, pré-requisitos, limites e consistência da ação.

O cliente nunca deverá enviar um valor de recurso final para que o servidor simplesmente aceite.

Não confiar em valores enviados pelo cliente para:

- Dano causado.
- Vida restante do inimigo.
- Quantidade de moedas recebidas.
- Resultado de batalha.
- Chance de drop.
- Raridade de item.
- Saldo de recursos.
- Posição no ranking.
- Resultado de PvP.
- Recompensa de anúncio.
- Resultado de compra.
- Duração de bônus.

O servidor calcula ou verifica esses resultados com base no estado confiável.

## 6.2. Cliques e mineração

Para o modo online, não crie um endpoint ilimitado que credite ferro a cada mensagem recebida.

Implemente:

- Rate limiting por conta.
- Limites coerentes com a velocidade de toque permitida.
- Validação da elegibilidade da ação.
- Identificação de mensagens duplicadas quando necessário.
- Registro de eventos relevantes.
- Detecção de padrões impossíveis.
- Respostas de erro previsíveis.

Não dependa apenas de um anticheat no cliente.

## 6.3. Combate autoritativo

O servidor será responsável pelo estado de batalha e pelos resultados que afetam a progressão.

Defina como o combate funciona durante desconexões, latência e inatividade.

Não dependa de enviar cada quadro de animação ao servidor. O cliente poderá reproduzir visualmente a batalha a partir de eventos e estados confirmados.

As animações podem atrasar ou antecipar visualmente uma ação, mas não podem alterar o resultado válido do combate.

## 6.4. Persistência e concorrência

Utilize transações no banco para operações que movimentam recursos ou itens.

A implementação deverá impedir:

- Gastos duplicados.
- Recompensas repetidas.
- Venda duplicada de um item.
- Transferência simultânea do mesmo item para dois compradores.
- Uso concorrente de saldo desatualizado.
- Reprocessamento indevido de eventos.

Utilize constraints, transações, controle de concorrência e chaves de idempotência quando apropriado.

Não use apenas um bloqueio visual no cliente para proteger itens ou moedas.

# 7. EXPERIÊNCIA VISUAL E LAYOUT

O jogo deverá ser projetado primeiro para celular em orientação vertical.

A interface deverá utilizar toda a área útil da tela, respeitando safe areas, barras do sistema e diferentes proporções de dispositivos.

Não crie uma página convencional com cabeçalho, cards de dashboard, menu lateral e tabelas como experiência principal.

O jogador deve sentir que está jogando um RPG mobile.

## 7.1. Divisão principal em três áreas

### Área superior — combate RPG

Exibe:

- Cenário atual.
- Herói.
- Inimigos.
- Boss quando aplicável.
- Barras de vida.
- Dano visual.
- Efeitos de ataque.
- Animações de vitória e derrota.
- Identificação do andar.
- Temporizador apenas nos combates que possuírem limite.
- Indicadores de recompensas e progressão.

A batalha será apresentada em perspectiva lateral 2D.

O herói deverá atacar automaticamente, e os inimigos deverão reagir conforme suas regras de combate.

### Área intermediária — clicker de ferro

Será o centro da interação inicial.

Exibe:

- Cena da mineração.
- Nó de minério.
- Contador de ferro.
- Ganho por clique.
- Efeitos de impacto.
- Partículas de mineração.
- Indicadores de bônus.
- Melhorias de clique.
- Evolução do nível de mineração.

Ao tocar no nó de ferro, o cliente apresenta imediatamente o feedback visual. No modo online, a recompensa somente será confirmada após validação do servidor.

A interface deverá responder bem a toques rápidos sem bloquear a interação.

### Área inferior — automações

Apresenta as minas e automações desbloqueadas.

Deverá permitir:

- Ver produção por segundo.
- Consultar nível.
- Ver custo de evolução.
- Comprar melhorias.
- Consultar requisitos de desbloqueio.
- Acompanhar a produção.
- Identificar recursos insuficientes.
- Alternar entre as minas quando o espaço visual for limitado.

Utilize abas, painéis compactos, listas de máquinas ou uma combinação de componentes que mantenha a hierarquia visual.

Não permita que a interface fique tão comprimida que os sprites e números se tornem ilegíveis.

## 7.2. Responsividade

O layout vertical é a prioridade. No desktop, mantenha a composição vertical centralizada em uma área de jogo de proporção apropriada, usando o espaço extra sem transformar o jogo em um dashboard.

O modo desktop poderá oferecer painéis complementares, desde que não prejudique a experiência mobile.

Implemente:

- Escala adaptativa.
- Layout para telas estreitas.
- Áreas de toque adequadas.
- Tratamento de safe areas.
- Redimensionamento sem distorcer sprites.
- Suporte a diferentes densidades de pixels.
- Estados de carregamento e reconexão.
- Feedback de conexão.
- Menus que não cubram os controles principais.

O jogo deverá continuar funcional em navegadores modernos de desktop e mobile.

# 8. LOOP PRINCIPAL DE GAMEPLAY

O ciclo principal deverá ser:

1. O jogador observa a batalha automática.
2. O herói derrota inimigos e ganha coins.
3. O jogador minera ferro por clique.
4. O jogador compra melhorias com os recursos disponíveis.
5. Minas e sistemas automatizados começam a produzir recursos adicionais.
6. Os recursos fortalecem o herói, seus equipamentos e mascotes.
7. O jogador avança por andares cada vez mais difíceis.
8. Bosses impõem verificações periódicas de força e estratégia.
9. Novos sistemas são desbloqueados.
10. O jogador retorna ao jogo e encontra progresso válido, inclusive produção offline quando aplicável.

A experiência deve começar com um ciclo de cliques gratificante e evoluir para uma combinação de mineração ativa, automação e progressão RPG.

# 9. PROGRESSÃO POR ANDARES

A torre deverá possuir 1.000 andares no escopo inicial.

Cada andar terá configuração própria, mesmo quando reutilizar inimigos ou cenários.

## 9.1. Andares comuns

Cada andar comum terá três ondas, cada uma contendo três inimigos.

Isso significa nove inimigos por andar comum, organizados em três ondas.

Essa regra representa a especificação detalhada do fluxo de combate. Caso o código ou a documentação antiga indique três inimigos no total, registre a divergência e adote a regra das três ondas de três inimigos como padrão.

Fluxo:

- Inicia a onda.
- Os inimigos lutam contra o herói.
- Cada inimigo derrotado gera a recompensa correspondente.
- A onda termina quando seus inimigos forem derrotados.
- Após a última onda, o andar é concluído.
- O herói inicia a caminhada ou transição visual até o próximo combate, com duração aproximada de três segundos.
- A próxima onda ou o próximo andar começa.

Os andares comuns não possuem limite de tempo.

## 9.2. Progressão automática

Após a conclusão de um andar, a progressão poderá continuar automaticamente, desde que o jogador não esteja bloqueado por uma decisão ou desafio que exija intervenção.

A interface deverá permitir pausar e retomar a progressão.

## 9.3. Bosses de dezena

Os andares 10, 20, 30, 40 e assim sucessivamente serão andares de boss.

Cada andar de boss possui uma única onda contendo um boss elite.

Características:

- Vida superior à dos inimigos comuns.
- Dano e resistência escaláveis.
- Temporizador de batalha.
- Recompensa de coins superior.
- Chance de drop de equipamento.
- Possibilidade de itens de qualidade elevada.
- Recompensas de conclusão.

A chance e a qualidade dos drops deverão crescer de maneira controlada conforme o nível do boss.

Se o jogador não derrotar o boss dentro do limite, será considerado derrotado, retornará ao andar anterior e a progressão automática ficará pausada.

O jogo não poderá iniciar tentativas infinitas de boss automaticamente após derrotas.

O jogador deverá apertar explicitamente um botão de tentar novamente para reiniciar o desafio.

A derrota deverá preservar o estado válido do personagem e impedir recompensas duplicadas.

## 9.4. Escalabilidade até o andar 1.000

Não crie mil conjuntos de sprites exclusivos.

Utilize combinações de:

- Famílias de inimigos.
- Reutilização controlada de sprites.
- Paletas alternativas.
- Efeitos adicionais.
- Escala de atributos.
- Modificadores de combate.
- Fundos por família de andares.
- Variações de equipamento.
- Efeitos de elite.
- Bosses com identidade própria.

Repetir inimigos entre faixas de andares é permitido.

As faixas 1–5, 6–9, 11–14 e 16–19 são exemplos de agrupamento, não uma regra rígida que exija novos sprites em cada intervalo.

Os níveis 10, 20, 30 e seguintes devem preservar a identidade visual dos bosses.

Não utilize recoloração como única diferença em toda a progressão. Combine modificadores visuais e mecânicos para manter variedade.

# 10. SISTEMA DE COMBATE

Crie um motor de combate modular e testável.

Defina atributos básicos:

- Vida máxima.
- Ataque físico.
- Ataque mágico.
- Defesa.
- Velocidade de ataque.
- Chance crítica.
- Multiplicador crítico.
- Precisão e evasão, se adotadas.
- Resistências, quando necessárias.
- Efeitos de estado.

Defina fórmulas explícitas para dano, defesa, crítico, velocidade e duração dos efeitos.

Não espalhe fórmulas arbitrárias por componentes visuais.

O combate deverá contemplar:

- Ataques automáticos.
- Tempo entre ataques.
- Animações de ataque.
- Aplicação de dano.
- Morte e remoção do alvo.
- Troca de alvo.
- Drops válidos.
- Efeitos temporários.
- Bosses.
- Modificadores de batalha.
- Velocidade de combate.
- Reconexão e recuperação do estado.

Crie testes determinísticos para as fórmulas e para os fluxos de vitória e derrota.

# 11. ECONOMIA E RECURSOS

A economia possui seis recursos principais.

## 11.1. Coin

Fonte principal: vitórias em batalhas.

Usos:

- Evolução de categorias.
- Melhorias do clicker.
- Melhorias de automações.
- Perks.
- Desbloqueios.
- Custos do mercado.
- Outras despesas de progressão definidas no balanceamento.

Coins devem ser um recurso de circulação frequente, com fontes e sumidouros controlados.

## 11.2. Ferro

Fonte principal: mineração por clique.

Começa em um ferro por clique.

O ganho deverá aumentar conforme a evolução do clicker e outros bônus autorizados.

Usos:

- Evolução do guerreiro.
- Aprimoramento de equipamentos.
- Evolução de mascotes.
- Desbloqueio e evolução de minas.
- Produção de ferro fundido.
- Outras receitas de fabricação.

## 11.3. Carvão

Fonte: mina automática de carvão.

Desbloqueio: gasto de ferro e coins.

Produção: pequena quantidade por segundo no nível inicial, aumentando conforme as melhorias.

Usos:

- Evolução de equipamentos.
- Fabricação de ferro fundido.
- Receitas de fabricação futuras.

## 11.4. Ouro

Fonte: mina automática de ouro.

Requisitos:

- Mina de carvão nível 50.
- Quantidades configuráveis de ferro, carvão e coins.

Usos:

- Evolução de equipamentos.
- Evolução de mascotes.
- Melhorias de níveis superiores.

## 11.5. Jade

Fonte: mina automática de jade, originalmente descrita como mina de diamante.

O nome oficial do recurso no jogo será Jade. A nomenclatura não deverá alternar aleatoriamente entre jade e diamante.

Desbloqueio: requisitos configuráveis de ferro, ouro, carvão e coins.

Usos:

- Equipamentos de níveis altos.
- Mascotes de níveis altos.
- Receitas avançadas.

## 11.6. Ruby

Moeda premium.

Fontes permitidas:

- Compras aprovadas.
- Eventos.
- Anúncios recompensados, quando previstos.
- Recompensas explícitas de sistemas do jogo.

Usos:

- Bônus temporários.
- Bônus permanentes vendidos de forma permitida.
- Baús e pacotes de recursos.
- Cosméticos.
- Outros itens configurados na loja.

A emissão e o gasto de rubies deverão ser registrados no servidor.

Não conceda rubies com base em uma mensagem de sucesso enviada pelo cliente.

# 12. CLICKER E PROGRESSÃO DAS MINAS

O clicker será o eixo central do começo do jogo.

O nível inicial concede um ferro por clique, antes dos bônus.

Implemente categorias de melhoria para:

- Ferro por clique.
- Bônus de mineração.
- Quantidade de mineradores por clique.
- Multiplicadores de produção.
- Melhorias de eficiência.
- Perks adquiridos com coins.

Cada melhoria deverá possuir custo, nível, limite quando aplicável, efeito e requisitos documentados.

## 12.1. Mina de carvão

Deverá poder ser desbloqueada com ferro e coins.

Produz carvão por segundo.

Seu nível aumenta a produção e poderá habilitar novos requisitos.

## 12.2. Mina de ouro

Exige mina de carvão nível 50.

Produz ouro por segundo.

Seu desbloqueio exige ferro, carvão e coins.

## 12.3. Mina de jade

Produz jade por segundo.

Seu desbloqueio exige ferro, ouro, carvão e coins.

Os requisitos e as curvas de produção devem ser definidos nos arquivos de configuração.

## 12.4. Produção offline

O jogo deverá calcular a produção offline de forma controlada.

No modo online, utilize timestamps e regras do servidor para calcular a produção elegível, respeitando limites e bônus válidos.

No modo local, utilize timestamps persistidos e uma política explícita de limite offline.

Não execute um loop de produção por segundo para cada segundo em que o jogador esteve ausente. Calcule a produção pelo tempo elegível e aplique os limites configurados.

# 13. EQUIPAMENTOS, RARIDADES E LOOT

Implemente um sistema de equipamentos com dados configuráveis.

Categorias iniciais:

- Espadas.
- Adagas.
- Machados.
- Maças.
- Armas de duas mãos.
- Lanças.
- Escudos.
- Arcos.
- Peitorais.
- Chapéus.
- Luvas.
- Botas.
- Colares.
- Anéis.

Os tipos de arma poderão possuir características próprias, desde que documentadas e balanceadas.

Os equipamentos deverão ter:

- Identificador.
- Categoria.
- Nome.
- Raridade.
- Atributos-base.
- Variações de atributos.
- Nível ou requisito.
- Bônus especiais quando aplicável.
- Referências aos sprites.
- Valor de mercado, quando aplicável.

A geração de itens deverá ocorrer no servidor.

A raridade não deverá ser apenas uma cor: deverá influenciar atributos, quantidade de propriedades e/ou efeitos conforme as regras definidas.

Drops de equipamento devem ser relativamente raros. Inimigos comuns não devem entregar equipamentos a cada derrota.

Bosses poderão conceder equipamentos, com melhores chances de raridades elevadas conforme sua progressão.

A probabilidade de drop e os multiplicadores deverão ser configuráveis e testados estatisticamente.

# 14. MASCOTES

Implemente mascotes como entidades de progressão, com:

- Identidade e sprite.
- Raridade.
- Nível.
- Atributos.
- Bônus passivos.
- Custos de evolução.
- Requisitos de desbloqueio.
- Dados de mercado, quando negociáveis.

Os mascotes poderão receber bônus de combate, produção ou progressão conforme seu tipo.

Os recursos necessários deverão seguir o balanceamento e a progressão do jogo.

Se os assets existentes não incluírem sprites de mascotes adequados, documente a lacuna em vez de usar personagens incompatíveis sem critério.

# 15. BOSS GLOBAL DIÁRIO

Implemente um evento global de boss, compartilhado entre os jogadores online.

Horário oficial: todos os dias às 22h, horário de Brasília, usando o fuso `America/Sao_Paulo`.

Não dependa do relógio do cliente para determinar o início ou o fim do evento.

O agendamento deverá ser executado no servidor, com proteção contra execução duplicada, reinicialização e falhas operacionais.

Deverá existir:

- Identificação da edição diária.
- Vida global do boss.
- Registro dos participantes.
- Registro do dano válido por jogador.
- Ranking de contribuição.
- Recompensas por faixas de contribuição.
- Recompensa especial do último golpe.
- Histórico do evento.
- Proteção contra dano duplicado.
- Reconexão e recuperação do estado.

As recompensas poderão incluir coins, rubies, baús de mascotes e outros itens configurados.

A recompensa de último golpe deverá ser concedida exatamente uma vez.

O sistema deverá definir como tratar jogadores desconectados, empates, falhas de comunicação e tentativas de repetir ataques.

## 15.1. Debug local

No MVP local, disponibilize um comando de debug para iniciar o evento manualmente.

Esse comando deverá ficar desabilitado em builds públicas e exigir permissões administrativas no modo online.

Não exponha um endpoint público que permita a qualquer usuário iniciar ou manipular o boss global.

# 16. EVENTOS RELÂMPAGO

Crie uma infraestrutura de eventos temporários com regras configuráveis.

Eventos previstos:

### Bônus de XP

Concede 30% de XP adicional durante seis horas.

O sistema deverá definir se o evento é global ou individual, sua data de início e término e como o bônus interage com outros modificadores.

### Loteria surpresa

Concede 100 rubies a um jogador escolhido aleatoriamente entre os elegíveis que estiverem online no instante do sorteio.

O sorteio deve ocorrer no servidor, com registro de participantes elegíveis e prevenção contra concessões duplicadas.

### Raid surpresa

Um mini boss individual aparece para jogadores elegíveis.

Ao derrotá-lo, o jogador recebe um baú de equipamento com chance de qualidade superior à habitual, conforme uma tabela específica.

Todos os eventos deverão possuir:

- Configuração.
- Critérios de elegibilidade.
- Janela temporal.
- Recompensas.
- Registro de execução.
- Proteção contra duplicação.
- Indicadores visuais.
- Mensagens de início e término.
- Testes para expiração e reinicialização.

Valorize jogadores ativos sem criar mecanismos que exijam permanecer conectado por períodos excessivos para não perder recompensas essenciais.

# 17. ANÚNCIOS RECOMPENSADOS

O jogo não poderá interromper a partida com anúncios inesperados.

Anúncios deverão ser iniciados voluntariamente pelo jogador e sempre conceder a recompensa anunciada após validação.

Recompensas previstas:

- Dois minutos de autoclick a três cliques por segundo.
- Dois minutos de recompensas de batalha em dobro.
- Dois minutos de dano de batalha em dobro.
- Uma quantidade de coins balanceada pelo progresso do jogador.

Defina regras para:

- Frequência máxima.
- Cooldown.
- Duração.
- Acúmulo ou incompatibilidade de bônus.
- Expiração.
- Reconexão.
- Elegibilidade.
- Falhas do provedor.
- Concessão idempotente.

O servidor deverá manter a concessão válida dos bônus.

A conclusão do anúncio deverá ser verificada por uma integração confiável com o provedor. Não aceite um simples booleano enviado pelo cliente como prova suficiente de visualização.

No Android, planeje a integração com o Google Mobile Ads SDK e mecanismos de validação de anúncios recompensados disponíveis para a plataforma.

No navegador, use apenas integrações compatíveis com a plataforma e o provedor selecionado. Se não houver uma integração adequada, mantenha o sistema desabilitado ou em modo de teste claramente identificado.

Nunca simule um anúncio real e conceda recompensas de produção sem autorização.

# 18. MICROTRANSAÇÕES

Planeje uma loja premium com:

- Rubies em pacotes.
- Bônus permanentes permitidos.
- Cosméticos.
- Baús de recursos, conforme as regras comerciais e de plataforma aplicáveis.

Os pacotes de ruby serão organizados em quatro categorias:

- Punhado.
- Saco.
- Pote.
- Baú.

As quantidades e os preços deverão ser configurados após simulações de economia e avaliação do mercado-alvo.

Não invente preços definitivos antes de realizar o balanceamento.

Implemente uma camada de compras independente da interface, com adaptadores para provedores.

No Android, utilize Google Play Billing para produtos digitais sujeitos às regras da plataforma.

O backend deverá validar as compras e impedir o uso repetido de um mesmo comprovante ou token de compra.

Planeje:

- Catálogo de produtos.
- Identificadores estáveis.
- Validação de recibos.
- Idempotência.
- Registro de transações.
- Recuperação de compras.
- Reembolsos e revogações.
- Reconciliação.
- Tratamento de compras pendentes.
- Ambiente de testes.

Não permita que o cliente conceda a si mesmo rubies ou bônus permanentes.

Bônus permanentes deverão ser avaliados quanto ao impacto competitivo, especialmente em PvP e rankings. Não prometa equilíbrio competitivo sem simulações.

# 19. LEILÃO E MERCADO DA COMUNIDADE

O mercado permitirá negociar itens entre jogadores.

Categorias previstas:

- Equipamentos.
- Mascotes, quando elegíveis.
- Skins.
- Recursos.
- Rubies, somente se essa modalidade for permitida pelas regras comerciais e pela plataforma de distribuição.

O vendedor deverá definir o item, a quantidade, o preço e o recurso aceito.

Moedas ou recursos aceitos poderão incluir coins, rubies, ferro, ouro, carvão e jade.

Compradores poderão comprar ou enviar contraofertas, conforme o estado do anúncio.

## 19.1. Taxas

A regra inicial proposta é:

- Taxa de 10% sobre a transação.
- Custo de 100.000 coins para anunciar.

Esses valores são parâmetros iniciais de design, não um balanceamento aprovado.

Simule o impacto dessas taxas em diferentes estágios da progressão antes de ativá-las na economia de produção.

Não permita que a taxa resulte em saldos negativos. Defina arredondamento, limites mínimos e o tratamento de itens indivisíveis.

Se o anúncio aceitar recursos diferentes de coins, documente exatamente como a taxa será calculada. Não aplique silenciosamente uma taxa de coins a recursos incompatíveis.

## 19.2. Duração e relistagem

Cada anúncio dura três dias.

Após a expiração, o item retornará ao inventário ou a um estado de anúncio expirado, conforme o fluxo definido.

Será necessário anunciar novamente para voltar ao mercado.

Se o vendedor remover antecipadamente um anúncio, deverá aguardar 24 horas para anunciar novamente o mesmo item.

Defina como identificar o mesmo item, principalmente para itens empilháveis e equipamentos únicos.

## 19.3. Bloqueio e transferência

Enquanto estiver anunciado, o item ficará indisponível para equipar, consumir, vender novamente ou transferir.

A compra deverá realizar, em uma transação atômica:

1. Verificar que o anúncio está ativo.
2. Verificar o saldo do comprador.
3. Verificar que o item está reservado.
4. Debitar o comprador.
5. Aplicar as taxas.
6. Creditar o vendedor.
7. Transferir o item ou recurso.
8. Encerrar o anúncio.
9. Registrar a operação.

Se qualquer etapa falhar, a operação deverá ser revertida.

A mesma lógica deverá proteger contra duas compras simultâneas.

## 19.4. Ofertas

As contraofertas deverão possuir prazo, valor, recurso, comprador e estado.

Uma oferta aceita deverá revalidar o anúncio, o item e os saldos antes de realizar a transação.

Não deixe ofertas pendentes bloquearem recursos indefinidamente.

## 19.5. Segurança econômica

Implemente:

- Histórico de transações.
- Rate limits.
- Proteção contra duplicação.
- Controle de concorrência.
- Prevenção contra transferências indevidas.
- Registro de cancelamentos.
- Moderação de anúncios.
- Tratamento de contas suspensas.
- Ferramentas administrativas auditáveis.

Não crie um sistema de transferência de dinheiro real entre jogadores.

A negociação de rubies e a conversão de recursos premium em outros ativos deverão ser revisadas juridicamente e em relação às regras da Google Play antes de serem ativadas.

# 20. ARENA PVP E RANKINGS

Implemente uma arena competitiva de progressão por posições.

O servidor será responsável pela lista de adversários, pelo resultado da luta, pela posição e pelos troféus.

## 20.1. Seleção de oponentes

O jogador verá cinco oponentes próximos de sua posição, seguindo a regra proposta.

Exemplo: um jogador na posição #1000 poderá encontrar os jogadores nas posições #999, #998, #997, #996 e #995.

O servidor deverá verificar a disponibilidade dos adversários e definir o comportamento quando não houver cinco jogadores elegíveis.

Não invente adversários que aparentem ser jogadores reais sem identificá-los como bots.

## 20.2. Vitória e derrota

Ao vencer, o desafiante assume a posição do derrotado, conforme as regras de ordenação definidas para a arena.

Ao perder:

- Mantém a posição.
- Perde troféus conforme a fórmula configurada.

Defina o tratamento de jogadores que deixam de existir, contas suspensas, empates e resultados inválidos.

A regra de movimentação de posições deverá ser formalizada para evitar inconsistências entre desafios concorrentes.

## 20.3. Troféus e premiações

Mantenha um ranking de troféus separado do ranking de posição.

As recompensas semanais deverão considerar os resultados elegíveis e possuir um processo idempotente de fechamento.

O servidor deverá registrar os resultados de batalha e o motivo da mudança de posição.

## 20.4. Segurança de PvP

Não permita que o cliente escolha o resultado da luta ou envie um valor arbitrário de dano.

Defina um modelo de combate competitivo consistente, com atributos confiáveis, equipamentos, efeitos, regras de tempo e desempate.

Não conceda vitórias apenas por o cliente informar que venceu.

# 21. GUILDAS

Implemente guildas com capacidade inicial de 20 jogadores.

A capacidade aumentará em dois membros por nível, até o nível 10, conforme a progressão aprovada.

Defina e documente o custo e os requisitos de evolução.

Sistemas previstos:

- Criação de guilda.
- Entrada e saída.
- Convites.
- Cargos e permissões.
- Chat próprio.
- Ranking semanal.
- Bônus de XP.
- Guerras de guildas.
- Participação no boss global.
- Brasão personalizável.

## 21.1. Brasão

O brasão deverá ser desenhado por uma grade de pixels, inspirado na mecânica de brasões de guildas de jogos clássicos.

Defina dimensões, paleta, limite de cores, validação e formato de armazenamento.

O brasão deverá aparecer no chat global junto ao apelido do membro.

Não permita imagens arbitrárias enviadas por usuários sem validação. Prefira uma matriz de pixels com limites rígidos.

## 21.2. Bônus de guilda

O bônus de XP deverá ser baseado no ranking da guilda na semana anterior, com fórmula e limites documentados.

No boss global, cada membro da guilda que estiver efetivamente participando ao mesmo tempo deverá contribuir com um bônus de ataque de 1%, conforme a regra proposta.

Defina o limite máximo, os critérios de presença e como evitar múltiplas sessões ou contas artificiais.

A presença deverá ser validada pelo servidor, e não apenas por uma flag de jogador online.

## 21.3. Guerra de guildas

A guerra de guildas deverá ser especificada com regras de inscrição, duração, pontuação, elegibilidade, recompensas, desempates e encerramento.

Não implemente uma guerra competitiva baseada apenas em dados enviados pelos clientes.

# 22. RANKINGS GLOBAIS

Implemente os seguintes rankings:

- Força total.
- Maior andar alcançado.
- Quantidade de coins.
- Maior dano em boss global.
- Último golpe em boss global.
- Ranking de guildas.
- Ranking de posição PvP.
- Ranking de troféus PvP.

Os rankings deverão ser classificados em permanentes ou sazonais.

Rankings de troféus, PvP, guildas e maior dano em boss global foram propostos para reset semanal.

A implementação deverá definir o significado exato do reset: zerar a pontuação, iniciar uma nova temporada, arquivar resultados ou combinar essas opções.

Não apague histórico necessário para auditoria.

Força total deverá ter uma fórmula única, documentada e calculável pelo servidor.

A quantidade de coins deverá ser obtida do saldo confiável, não de valores enviados pelo cliente.

O ranking de último golpe deverá ser registrado a partir do evento real de derrota do boss.

Crie índices, estratégias de atualização e testes para evitar rankings desatualizados ou inconsistentes.

# 23. AUTENTICAÇÃO E IDENTIDADE

O sistema online deverá suportar autenticação Google e, quando adequado ao produto final, conta de convidado.

No modo local, disponibilize um perfil de teste sem autenticação externa.

Defina como a conta de convidado poderá ser vinculada a uma conta Google sem perder o progresso ou permitir a apropriação de contas.

Cada conta terá um único rei/personagem de identidade.

A representação do rei será um retrato em PNG, com foco em rosto e tórax.

Esse retrato deverá aparecer somente na HUD e no perfil, conforme a identidade visual proposta.

O nome do rei será o apelido público único do jogador, com regras de normalização, tamanho, caracteres permitidos e prevenção contra falsificação de nomes.

A conta também terá nível próprio, separado do nível do guerreiro.

Não confunda conta, personagem principal, heróis recrutados e mascotes.

# 24. MONETIZAÇÃO E PUBLICAÇÃO ANDROID

A arquitetura deverá permitir futura publicação na Google Play.

Mantenha o cliente web desacoplado das APIs específicas do Android.

Avalie uma estratégia de empacotamento como Capacitor, ou alternativa compatível, somente depois de validar desempenho, integração com o canvas, áudio, teclado, ciclo de vida e comportamento offline.

A camada de plataforma deverá abstrair:

- Autenticação.
- Compras.
- Anúncios recompensados.
- Restauração de compras.
- Estado de conexão.
- Retorno ao aplicativo.
- Pausa e retomada.
- Identificação de plataforma.

No Android, planeje a integração com Google Play Billing para produtos digitais e com o provedor de anúncios selecionado.

As integrações de produção deverão utilizar SDKs oficiais e mecanismos de validação compatíveis com a plataforma.

Não simule compras ou anúncios em builds públicas.

Antes do lançamento, verifique as políticas vigentes da Google Play, anúncios, pagamentos, privacidade, proteção de menores, declarações de dados e requisitos de publicação.

A monetização não deverá interromper o combate automaticamente nem forçar o jogador a assistir anúncios para continuar jogando.

# 25. ESTRUTURA DE DADOS

Modele os dados de forma explícita.

Entidades previstas:

- Account.
- PlayerProfile.
- PlayerProgress.
- ResourceBalance.
- ResourceLedger.
- Hero.
- EquipmentDefinition.
- EquipmentInstance.
- PetDefinition.
- PetInstance.
- Inventory.
- Mine.
- Upgrade.
- Perk.
- BattleSession.
- BattleEvent.
- FloorProgress.
- BossDefinition.
- GlobalBossEvent.
- GlobalBossContribution.
- FlashEvent.
- RewardClaim.
- Purchase.
- PremiumCurrencyLedger.
- MarketListing.
- MarketOffer.
- MarketTransaction.
- PvPMatch.
- PvPRating.
- TrophyLedger.
- Guild.
- GuildMember.
- GuildEmblem.
- GuildWar.
- ChatMessage.
- RankingSnapshot.
- AuditLog.

Esses nomes são referências conceituais. Ajuste o modelo final ao domínio e evite duplicar entidades sem necessidade.

Diferencie definições imutáveis de instâncias de itens e estados pertencentes a jogadores.

Crie migrações versionadas, constraints, índices e políticas de retenção.

Não armazene o saldo apenas em um log sem estratégia de leitura, nem mantenha saldos críticos sem possibilidade de auditoria.

# 26. BALANCEAMENTO E CONFIGURAÇÃO

Toda fórmula importante deverá ser documentada e testável.

Centralize configurações como:

- Dano-base.
- Vida dos inimigos.
- Escala por andar.
- Vida dos bosses.
- Tempo limite dos bosses.
- Recompensas de coins.
- Custo de upgrades.
- Produção das minas.
- Probabilidades de drop.
- Multiplicadores de raridade.
- Custos de fabricação.
- Taxas do mercado.
- Duração de bônus.
- Frequência de eventos.
- Limites de anúncios.
- Recompensas semanais.
- Custos de guildas.

Não espalhe números de balanceamento por componentes da interface.

Crie simuladores ou scripts que permitam estimar a progressão dos andares, o tempo de desbloqueio das minas, a inflação de coins, o valor do ferro, a frequência de drops e o impacto de bônus pagos.

O balanceamento inicial deverá ser marcado como provisório até ser validado por simulações e testes de jogo.

Não invente uma economia definitiva sem avaliar os efeitos combinados de progressão, mercado e monetização.

# 27. MODO LOCAL E MODO ONLINE

O projeto deverá possuir dois ambientes claramente separados.

## 27.1. Modo local

Utilizado para desenvolvimento, testes de gameplay e validação visual.

Deverá permitir testar:

- Combate.
- Clicker.
- Minas.
- Equipamentos.
- Bosses.
- Eventos por debug.
- Interface.
- Persistência local.
- Produção offline.
- Fluxos de derrota e vitória.

O modo local poderá utilizar dados simulados, mas deverá identificá-los como dados de teste.

Não trate o modo local como prova de segurança do sistema online.

## 27.2. Modo online

Utiliza o servidor e o banco de dados reais.

Deverá validar:

- Autenticação.
- Autorização.
- Economia.
- Inventário.
- Progressão.
- Combate.
- Drops.
- Mercado.
- PvP.
- Guildas.
- Rankings.
- Eventos.
- Compras.
- Anúncios.

Não permita que o modo debug seja ativado por parâmetros de URL ou comandos públicos no ambiente de produção.

# 28. TESTES OBRIGATÓRIOS

Crie testes unitários, de integração e de segurança.

Cobertura mínima dos fluxos críticos:

- Um clique concede a quantidade correta de ferro.
- Cliques acima do limite são rejeitados ou limitados.
- Upgrades não podem ser comprados sem recursos suficientes.
- Recursos não ficam negativos.
- Produção automática respeita a configuração.
- Produção offline respeita os limites.
- Combate termina em vitória ou derrota.
- Andares comuns não expiram por tempo.
- Bosses possuem limite de tempo.
- A derrota no boss pausa a progressão automática.
- A recompensa de um inimigo não é concedida duas vezes.
- Um item não pode ser vendido simultaneamente duas vezes.
- A compra no mercado é atômica.
- Ofertas não podem consumir recursos indevidamente.
- Compras premium não podem ser processadas duas vezes.
- Um anúncio recompensado não pode ser resgatado repetidamente.
- Um evento global não pode ser executado duas vezes para a mesma edição.
- O último golpe no boss global é registrado uma única vez.
- A movimentação de posições PvP permanece consistente.
- Os troféus são calculados no servidor.
- As permissões de guilda são respeitadas.
- A geração de brasões respeita limites.
- Rankings não aceitam valores enviados pelo cliente.
- A reconexão recupera o estado válido.
- O sistema suporta falhas de rede sem duplicar transações.

Inclua testes de concorrência para mercado e operações de saldo.

Crie cenários de abuso, incluindo mensagens repetidas, parâmetros alterados, saldos desatualizados, duas compras simultâneas e desconexões durante operações.

Não marque os testes como concluídos apenas porque o framework foi instalado.

# 29. ROADMAP DE DESENVOLVIMENTO

Siga esta ordem, adaptando as dependências conforme a inspeção inicial.

## Fase 0 — Auditoria

- Inspecionar repositório.
- Verificar estrutura e dependências.
- Inventariar assets.
- Identificar licenças.
- Documentar riscos.
- Criar os documentos oficiais.
- Definir arquitetura e critérios de aceite.

Entrega: projeto compreendido e documentado, sem reescrita desnecessária.

## Fase 1 — Fundação técnica

- Configurar cliente e servidor.
- Configurar TypeScript.
- Criar contratos compartilhados.
- Configurar testes.
- Configurar build.
- Criar configuração de ambiente.
- Estabelecer persistência.
- Implementar logs e tratamento de erros.

Entrega: cliente e servidor executáveis de forma independente.

## Fase 2 — Protótipo visual jogável

- Construir o layout vertical.
- Integrar o protagonista.
- Integrar inimigos.
- Criar a cena de combate.
- Criar a cena da mineração.
- Integrar os nós e ícones de recursos.
- Criar feedback de clique.
- Implementar uma primeira animação de combate.
- Validar redimensionamento.

Entrega: uma tela de jogo visualmente convincente, ainda com economia limitada.

## Fase 3 — Loop principal

- Combate automático.
- Três ondas por andar comum.
- Três inimigos por onda.
- Recompensas de coins.
- Progressão de andares.
- Temporizador de boss.
- Derrota e retomada manual.
- Clicker.
- Upgrades.
- Mina de carvão.
- Persistência local de teste.

Entrega: loop principal completo e jogável.

## Fase 4 — Progressão RPG

- Equipamentos.
- Raridades.
- Drops.
- Mascotes.
- Evolução do guerreiro.
- Minas de ouro e jade.
- Fabricação.
- Bônus temporários.
- Balanceamento inicial.

Entrega: progressão funcional além do primeiro ciclo de jogo.

## Fase 5 — Servidor autoritativo

- Autenticação.
- Estado persistente online.
- Validação de recursos.
- Combate autoritativo.
- Produção offline.
- Controle de concorrência.
- Proteções contra abuso.
- Migrações.
- Testes de segurança.

Entrega: progressão online validada pelo servidor.

## Fase 6 — Comunidade

- Chat global.
- Guildas.
- Brasões.
- Rankings.
- PvP.
- Temporadas.
- Eventos globais.
- Eventos relâmpago.

Entrega: sistemas sociais e competitivos testáveis.

## Fase 7 — Economia compartilhada

- Mercado.
- Anúncios.
- Reservas de itens.
- Ofertas.
- Transações atômicas.
- Histórico.
- Taxas configuráveis.
- Ferramentas administrativas.

Entrega: mercado com proteção contra duplicação e inconsistências.

## Fase 8 — Monetização

- Catálogo premium.
- Adaptador de compras.
- Validação de recibos.
- Anúncios recompensados.
- Registro de concessões.
- Recuperação de compras.
- Testes de sandbox.

Entrega: integrações de teste verificáveis, sem simulações confundidas com produção.

## Fase 9 — Android

- Empacotamento.
- Integração de plataforma.
- Ciclo de vida.
- Testes em dispositivos.
- Desempenho.
- Privacidade.
- Conformidade de pagamentos e anúncios.
- Preparação de lançamento.

Entrega: build Android de teste e checklist de publicação.

## Fase 10 — Polimento e lançamento

- Balanceamento.
- Otimização de sprites.
- Testes de carga.
- Testes de rede.
- Testes de recuperação.
- Auditoria de segurança.
- Verificação de licenças.
- Monitoramento.
- Plano de rollback.
- Checklist de lançamento.

Entrega: versão candidata ao lançamento, com riscos conhecidos registrados.

# 30. ADMINISTRAÇÃO E DEBUG

Crie ferramentas administrativas separadas da interface normal do jogador.

No MVP local, disponibilize ferramentas de debug para:

- Iniciar boss global.
- Iniciar eventos.
- Alterar o andar de teste.
- Adicionar recursos de teste.
- Simular drops.
- Ver o estado de batalha.
- Simular reconexão.
- Ver logs de economia.

No modo online, essas ações deverão exigir autenticação e permissões administrativas específicas.

Toda alteração administrativa de recursos, compras, posições ou recompensas deverá ser registrada com autor, data, motivo e valores envolvidos.

Não exponha ferramentas de debug em produção sem controle de acesso.

# 31. CRITÉRIOS DE QUALIDADE VISUAL

O jogo deverá possuir uma identidade artística coerente com fantasia medieval.

Prioridades:

- Personagens claramente visíveis.
- Combate lateral legível.
- Efeitos de impacto.
- Feedback de mineração.
- Ícones consistentes.
- Hierarquia clara de raridades.
- Bosses visualmente destacados.
- Cenários que não disputem atenção com a batalha.
- Interface legível em telas pequenas.
- Animações curtas e responsivas.
- Feedback imediato de compra, desbloqueio e recompensa.

Não use um fundo excessivamente detalhado que prejudique a leitura dos combatentes.

Não misture arbitrariamente sprites pixel art com ilustrações de proporções incompatíveis.

Não tente corrigir todos os assets com filtros automáticos.

Quando necessário, crie elementos de interface próprios para unificar o conjunto, preservando os sprites originais.

# 32. DESEMPENHO

Priorize dispositivos Android de entrada e navegadores mobile.

Otimize:

- Quantidade de texturas.
- Carregamento de assets.
- Uso de memória.
- Número de partículas.
- Atualização de interface.
- Frequência de comunicação.
- Reutilização de objetos.
- Quantidade de entidades simultâneas.
- Consultas ao banco.
- Cálculo de produção offline.
- Atualização de rankings.

Não execute atualizações de banco a cada quadro de renderização.

Não envie mensagens de rede desnecessárias para reproduzir animações locais.

Implemente carregamento organizado de recursos e trate falhas de carregamento.

Estabeleça métricas reais de desempenho e teste em aparelhos e navegadores representativos.

# 33. PADRÕES DE IMPLEMENTAÇÃO

- TypeScript estrito.
- Funções pequenas e responsabilidades claras.
- Regras de negócio separadas da apresentação.
- Configuração separada do código.
- Migrações versionadas.
- Erros explícitos.
- Logs estruturados.
- Testes automatizados.
- Sem segredos no repositório.
- Sem dados de produção em fixtures.
- Sem dependências abandonadas sem justificativa.
- Sem endpoints administrativos públicos.
- Sem valores econômicos críticos hardcoded na UI.
- Sem funções vazias que aparentem implementar sistemas.
- Sem mocks silenciosos em produção.
- Sem supressões de erros de TypeScript para esconder problemas.
- Sem dados fictícios apresentados como resultados reais.

Não faça refatorações amplas sem necessidade. Prefira mudanças pequenas e verificáveis.

# 34. DEFINIÇÃO DE PRONTO

Uma funcionalidade somente poderá ser marcada como concluída quando:

1. A regra estiver documentada.
2. O código estiver implementado.
3. A integração com os módulos necessários estiver funcionando.
4. Os testes relevantes passarem.
5. Os fluxos de erro tiverem sido considerados.
6. Os dados persistirem corretamente quando necessário.
7. A interface apresentar o estado correto.
8. As proteções necessárias estiverem implementadas.
9. Não houver bloqueios conhecidos ocultados.
10. O estado da documentação tiver sido atualizado.

Uma tela com um botão funcional não significa que o sistema inteiro está pronto.

Um endpoint que responde com sucesso não significa que a operação econômica é segura.

Um sistema local funcional não significa que a versão online está validada.

Um protótipo visual não significa que o jogo está pronto para publicação.

# 35. FLUXO DE TRABALHO COM O AGENTE

Execute as etapas de forma disciplinada.

Primeiro, inspecione o repositório e produza o relatório de auditoria.

Segundo, atualize ou crie a documentação prévia.

Terceiro, proponha a arquitetura final e as decisões técnicas pendentes.

Quarto, implemente a fundação técnica.

Quinto, entregue o loop jogável.

Sexto, expanda a progressão.

Sétimo, implemente a arquitetura online e os sistemas comunitários.

Oitavo, valide monetização e publicação.

Ao concluir cada etapa:

- Execute os testes aplicáveis.
- Execute o build.
- Corrija erros encontrados.
- Atualize `AI_STATE.md`.
- Atualize o roadmap.
- Registre decisões arquiteturais.
- Informe os arquivos criados ou alterados.
- Informe o que foi realmente validado.
- Informe limitações e próximos passos.

Não declare o projeto completo antes de cumprir os critérios de aceite.

Se uma tarefa for grande demais para uma única execução, divida-a em subtarefas com dependências explícitas, mantendo o objetivo final intacto.

Não remova sistemas previstos apenas para simplificar o desenvolvimento. Se precisar adiar uma funcionalidade, registre-a no roadmap com motivo, dependências e critérios de conclusão.

# 36. PRIMEIRA ENTREGA OBRIGATÓRIA

Comece agora pela Fase 0.

Sua primeira entrega deverá conter:

1. Relatório da estrutura real do repositório.
2. Inventário técnico e visual dos assets.
3. Manifesto inicial dos sprites.
4. Relatório de licenças e lacunas.
5. Constituição do projeto.
6. GDD inicial.
7. Arquitetura proposta.
8. Modelo inicial de dados.
9. Plano de segurança.
10. Plano de balanceamento.
11. Roadmap com dependências.
12. `AI_STATE.md`.
13. Critérios de aceite do MVP.

Não afirme que inspecionou arquivos aos quais não teve acesso.

Se o ambiente não permitir a leitura dos sprites, identifique a limitação, tente os meios disponíveis no próprio repositório e registre exatamente o que ficou pendente. Não substitua a auditoria por uma lista de nomes presumidos.

Após a documentação e a auditoria, avance para a fundação técnica e para a primeira versão jogável.

O objetivo é construir o Projeto Akai como um produto de jogo sustentável, expansível e pronto para evoluir de um protótipo de navegador para um RPG Idle Clicker mobile com economia confiável, competição online e monetização responsável.

**Comece pela inspeção real do repositório. Documente antes de implementar. Valide antes de declarar concluído.**