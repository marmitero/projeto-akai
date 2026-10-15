# Escopo e aceite do primeiro MVP local

Proposta de fatia verificável, não autorização para iniciar nem redefinição do produto final. Sem código implementado. Dependências: F1–F3 do ROADMAP, guias de arte e configuração experimental.

## Conteúdo incluído

Perfil local rotulado, três telas independentes e HUD; herói com idle/ataque/corrida/morte; pelo menos uma família de inimigo e um boss lateral apropriado; andares 1–20 por configuração; ferro por toque, upgrades de clique e guerreiro, carvão automático, save e produção de minas offline. Os bosses 10/20 podem reutilizar arte com atributos diferentes, sem fingir conteúdo exclusivo.

Mochila/Loja/Mais precisam de navegação consistente; quando um sistema não estiver implementado, exibir indisponibilidade clara sem cobrar recursos. Não fingir compra ou inventário funcional. Gold/Jade, equipamentos completos, mascotes, social, anúncios e Android pertencem a fases posteriores.

## Critérios executáveis de aceite

| ID | Cenário e resultado esperado |
|---|---|
| M01 | Build do cliente e servidor e typecheck passam com instruções reproduzíveis; nenhum segredo no bundle. |
| M02 | Batalha → Mina → Produção → Batalha mantém IDs de combate, onda, vida e cooldowns; produção continua. |
| M03 | Repetir navegação 50 vezes não duplica input, timer, assinatura ou ganho. |
| M04 | 10 toques válidos iniciais dão 10 ferros; toque fora da Mina ou sob modal não concede recurso. |
| M05 | Comprar upgrade debita custo exato; sem saldo rejeita sem mudança; saldo nunca fica negativo. |
| M06 | Carvão bloqueado mostra requisito; desbloqueado produz taxa configurada, preservando frações internamente. |
| M07 | Andar comum exige 3×3 inimigos e não expira; não avança após a primeira onda. |
| M08 | Boss 10/20 usa uma onda/um alvo e temporizador; timeout/morte pausa no andar anterior, sem nova tentativa automática. |
| M09 | Boss derrotado durante Mina gera um único prêmio; falha gera indicador em Batalha e só recomeça manualmente. |
| M10 | Reload restaura recursos/upgrades/progresso; save inválido oferece recuperação sem apagar silenciosamente o anterior. |
| M11 | Retorno calcula carvão até o cap experimental de 8h uma vez; navegar entre telas não concede offline. Relógio regressivo concede zero. |
| M12 | 320/360/390/768 CSS px, orientação e safe areas não cortam controles; alvos ≥44 CSS px; teclado/foco nos menus DOM. |
| M13 | Sprites recortados corretamente, pés sem saltos entre animações, ícones não distorcidos, erro de asset tratado. |
| M14 | Sessão local de 30 minutos sem crescimento sustentado de listeners/texturas nem travamento; registrar dispositivo, FPS e memória medidos. |
| M15 | Testes de domínio/save/fluxos acima executados, limitações registradas em AI_STATE. |

## Fora do aceite desta fatia

Não comprova anticheat, escalabilidade, equilíbrio da economia final ou aptidão comercial. Não importa save local para conta online. Entrega é candidata a avaliação de gameplay; exige feedback sobre ritmo/legibilidade antes de avançar ao conteúdo maior.

## Evidência parcial de F2

Navegação visual, input, safe areas/alvos, save e recortes têm evidência no relatório F2. Isso cobre partes de M02/M03/M10/M12/M13; não marca esses critérios completos quando dependem de combate, recursos ou recuperação de progresso ainda inexistentes. O aceite do MVP continua futuro.
