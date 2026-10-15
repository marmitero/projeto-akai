# Art Bible — direção visual inicial

Proposta curada com base no acervo auditado. Não é aprovação de todas as combinações. Referências: [catálogo](../Visual_Catalog.md), [manifesto](../Asset_Manifest.md) e [guia técnico](../Asset_Usage_Guide.md).

## Identidade

Fantasia medieval, combate lateral, personagens pixel art legíveis e interface ornamental roxo/dourado. Herói de cabelo branco de Character como referência de escala inicial. Backgrounds Normal/Autumn/Winter dão variação por faixa de andares; a cor do cenário não determina buff econômico automaticamente.

Paleta de interface **proposta**, não extraída como paleta oficial dos packs: fundo #20242D, painel #25203D, contorno #D4A85A, texto #F6EBDD, secundário #C8BED0, alerta #E87575, confirmação #8DD2A0. Validar contraste de cada par com ferramenta de acessibilidade; nenhum resultado WCAG foi medido ainda. Preservar paletas originais dos sprites, sem filtro global.

## Composição por tela

Batalha: herói à esquerda, inimigos à direita, chão compartilhado; cabeças, armas e efeitos cabem no viewport. Fundos menos contrastados que atores. Boss deve parecer maior pela composição, não necessariamente por escala arbitrária. Mina: piso escuro com nó central ampliado nearest-neighbor; poeira localizada e números curtos. Produção: nós/ícones de recursos dentro da mesma linguagem de molduras, sem máquinas industriais inventadas.

HUD: uma família de painéis e botões consistente; preferir roxo/dourado. Moldura não é retrato. Ícone de equipamento não é roupa animada. Raridade usa cor + nome/ornamento aprovado. Mapear regiões de nine-slice e estados antes de esticar.

## Escala, câmera e animação

Herói 2×/3× é ponto de partida a testar, não obrigação em todo aparelho. Ícones 32×32 podem usar escala inteira em área de toque maior; nós 16×16 precisam de ampliação inteira. Centralizar ator pela posição dos pés, não bbox variável por frame. Ataque do herói e morte têm células diferentes; offsets constam do registro de runtime após medição.

Margens de câmera devem acomodar arma/FX; limitar tremor a eventos especiais e permitir desativar. Idle/run em loop, ataque uma vez, morte segura no último frame. Evento de dano do domínio controla reação visual; FPS não altera resultado. Original sempre preservado; derivados usam nearest-neighbor para pixel art. Robots/trolls de acabamento detalhado precisam de avaliação própria de filtro e escala.

## Compatibilidade e seleção

Prioridade inicial: Character + uma família pixel art lateral + fundos Normal + Hud. Bosses cartoon de quatro vistas precisam de comparação composta; usar Left/Right e não misturar Front/Back no combate. Robots/trolls podem ficar reservados a conteúdo especial ou substituição futura se destoarem. Bases Male/Female exigem mapa de ações e oclusão, não apenas sobreposição de imagens iguais em tamanho. Evitar uniformizar tudo com recoloração/contorno automático.

## Efeitos e orçamento inicial

Proposta local: até 24 partículas de mineração simultâneas e um impacto visual curto por toque amostrado; grandes efeitos só em eventos relevantes. Dano flutuante agrega spam e reutiliza objetos. Orçamento deve ser reduzido em aparelhos lentos sem alterar recompensa. GIF de demonstração não entra na cena; usar frames PNG selecionados. Não deixar FX ocultar mina, HP ou menu.

## Entrega e rastreabilidade

Cada derivado registra source path/hash, recortes, padding, escala, palette edit se houver, versão e licença. Keys semânticas (`hero.idle`, `resource.iron`) diferem dos IDs estáveis de auditoria. Não renomear Acessories, Equipments ou Jumlp-All silenciosamente. Só assets selecionados entram no pacote. Critério de aprovação: contato, prévia composta estática, animação em loop/ataque/morte e captura em mobile com pivôs estáveis. Na auditoria original não havia prévia composta; o subset F2 tem validação técnica registrada abaixo.

Lacunas: retrato de rei, identidade de mascotes, Coin definitivo, áudio/fontes e licenças. Registrar em ASSET_LICENSES e DECISIONS; não criar arte substituta sem necessidade autorizada.

## Subset aprovado tecnicamente na F2

Character/Skeleton laterais, Normal BG e Hud roxo/dourado integrados e revisados nas composições do STAGE_02_REPORT. Pivôs/recortes de apenas esse subset em RUNTIME_ASSETS/Runtime_Asset_Manifest. Isso não aprova outros packs ou resolve licenças; retrato, Coin definitivo e profiling real continuam abertos.

## Composição F3

Guardião Ossudo10/20 é Skeleton ampliado2,8×, com idle/ataque/morte e rótulo de boss, não um pack exclusivo. HeroRun rastreado na mesma escala/pivot do guerreiro para transição3s. Vida/custos/progresso são DOM, mantendo tipografia legível e cenários feitos de sprites. Evitar efeitos que atrasem a confirmação de estado; morte fora da tela usa pose final. Sem áudio novo ou licença comprovada nesta fase.
