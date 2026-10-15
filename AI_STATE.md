# AI_STATE — continuidade do Projeto Akai

Atualizado: 15/10/2026. **Estado: DOCUMENTAÇÃO PREPARADA; AGUARDAR NOVA INSTRUÇÃO.**

## Objetivo e limite da sessão

Pedido atual: escrever toda a documentação necessária antes de desenvolver e aguardar. Nenhuma autorização para começar código nesta etapa. Ao concluir publicação dos documentos, parar. A orientação genérica do Master Prompt para seguir à fundação não supera esta pausa explícita.

## Estado real do repositório

Base inspecionada: `c577406dc292161e09838ac6e05ca3f8c65f87ce` em main. Contém acervo sprites, referencia_visual.jpg, Master Prompt, três guias e inventário/prévias. Ainda **não existe cliente, servidor, package.json, banco, autenticação, build ou suíte de gameplay**. Stack documentada é planejamento, não instalação.

Auditoria prévia: 7.568 arquivos/6.872 PNGs, 757 grupos de duplicatas, 47 páginas e 23 folhas de contato. Inventário técnico integral; inspeção visual é representativa para inimigos/bosses. Licenças, recortes/pivôs e aprovação de combinações continuam parciais. Não reauditar 1,25GB de assets sem motivo; consultar arquivos canônicos primeiro.

## Entregas documentais desta etapa

Constituição, auditoria de estado, GDD, roadmap, aceite do MVP, arquitetura, contratos de API, dados, segurança, economia, fórmulas experimentais/drops, UI/UX, Art Bible/licenças, testes, desempenho, operação, release checklist, riscos, decisões, rastreabilidade e quatro ADRs. Índice em [docs/README.md](docs/README.md). Sem alteração dos sprites originais ou código do jogo.

## Decisões aprovadas

Três telas Batalha/Mina/Produção e HUD inferior; simulação continua entre telas. Ferro inicial 1/clique; carvão automático; ouro exige carvão50; nome Jade. Três ondas de três por andar comum; boss em múltiplos de dez, uma onda/um alvo com timer; falha retorna e pausa até retry manual. Meta de 1.000 andares. Online autoritativo e modos local/online separados. Documentar agora e aguardar.

## Propostas e decisões pendentes

Primeira fatia de 20 andares, cap offline experimental de oito horas só para minas, slots/raridades e curvas novas são propostas, não aprovação do usuário. Provedor/versões/hosting não escolhidos definitivamente. PvP/guerra de guildas/bônus de presença, preços/cooldowns premium, licenças, Coin/retrato/mascotes precisam de decisões/evidência nas fases correspondentes. Ver [DECISIONS](docs/DECISIONS.md) e [RISKS](docs/RISKS.md).

## Concluído, parcial e não iniciado

- Concluído nesta etapa: redação da baseline documental e mapeamento de regras/riscos/aceite.
- Parcial: Fase0 como um todo (documentação preparada, arte e licenças não liberadas integralmente).
- Não iniciado: Fases1–10, implementação, simulação de economia, teste de gameplay, provisionamento e deploy do jogo.
- Não há funcionalidade de jogo declarada pronta.

## Últimas verificações

Auditoria anterior decodificou PNG/GIF sem falhas e preservou os originais. Nesta etapa: validação estrutural dos 31 novos documentos, links Markdown locais, blocos de código fechados, contagem de licenças e presença dos documentos exigidos passou. Revisão cruzada de regras aprovadas/propostas e da pausa solicitada concluída. `git diff --check` sem erros; o commit final da documentação fica identificado no histórico Git e na mensagem de entrega. Não alegar build/teste do jogo: não há aplicação executável. Versionamento da documentação não é evidência de gameplay.

## Próxima tarefa exata

**Agora: aguardar nova instrução do usuário.** Se posteriormente autorizado a implementar: ler Constituição/GDD/ROADMAP/MVP_ACCEPTANCE, conferir HEAD e alterações, resolver versões da stack e preparar F1-01. Não iniciar todos os sistemas do Master Prompt simultaneamente; não remover backlog futuro para simplificar.

## Continuidade e atualização

Ao terminar qualquer fase futura, atualizar este arquivo com objetivo, estado real, comandos/testes/resultados, problemas, arquivos e próxima tarefa. Registrar commit da entrega no histórico Git/mensagem final; não inserir hash do próprio commit como se conhecido antes de criá-lo. Preservar trabalho existente e manter regras aprovadas distintas de experimentos.
