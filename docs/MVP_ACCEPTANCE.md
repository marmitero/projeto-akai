# Escopo e aceite do primeiro MVP local

Fatia local implementada em F1–F3; aceite abaixo exige evidência própria, sem redefinir o produto final. Dependências: F1–F3 do ROADMAP, guias de arte e configuração experimental.

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

Navegação visual, input, safe areas/alvos, save e recortes têm evidência no relatório F2. Isso cobre partes de M02/M03/M10/M12/M13; não marca esses critérios completos quando dependem de combate, recursos ou recuperação de progresso ainda inexistentes. Na entrega F2, o aceite do MVP ainda era futuro; a evidência F3 abaixo atualiza esse estado.

## Evidência F3

| Critérios | Evidência executada / situação |
|---|---|
|M01 | npm run check: hashes, typecheck,31 testes e builds cliente/servidor |
|M02/M03 | Teste de sessão50 ciclos preserva agenda/ID; smokes dev/produção50 ciclos e34 texturas/37 objetos estáveis |
|M04 |10 toques=10 ferro; input fora da Mina e sob modal bloqueado no navegador |
|M05 | Compras exatas/rejeição sem mutação nos testes; melhoria real+reload no navegador |
|M06 | Carvão desbloqueia e produz0,1/s no1;12.347 passos1ms equivalem ao intervalo único, remainder preservado |
|M07 | Teste de9 mortes/3 ondas/transições; primeira onda não conclui andar |
|M08/M09 | Boss único10/20, deadline vence empate, derrota/timeout pausa no anterior; retry/treino manual e vitória com Mina ativa |
|M10 | Snapshot de gameplay, migração real1→2, backup/quarentena/versão futura e CAS concorrente testados; browser reload mantém nível/tela |
|M11 |24h limitadas a8h, watermark/reload impede segundo crédito; relógio regressivo zero, ausência sem luta e boss pode expirar |
|M12/M13 | Smokes320/360/390/768 e844×390 horizontal, HUD/alvos/scroll, nove animações, captura revisada, erro de asset bloqueia minério |
|M14 | Aceito no ambiente registrado: 30min reais (1800914ms),1784 ciclos,127 listeners/34 texturas/37 objetos estáveis, heap apósGC5.91–6.64MiB e média rAF por minuto59.95–60.02 após aquecimento; JSON/CPU/navegador em STAGE_03_REPORT |
|M15 |31 testes e resultados de simulação em BALANCE/STAGE_03_REPORT; limitações registradas |

A versão local não valida antiabuso/ledger do online. Ouro/jade, itens, pets e receitas permanecemF4. Layout/ritmo ainda devem receber playtest humano. Medição headless por software não substitui Android/WebGL em aparelho.

## Incremento F4 — aceite local adicional

MVP1–20/F3 permanece evidência histórica. F4 exige:categorias/slots/raridade reais, transações/Forja, capacidade/overflow, pet/minas avançadas e expiração precisa, migração2→3 e referências válidas,1.000 definições numericamente seguras e interface navegável.45 testes, smokes e simulações registrados em STAGE_04_REPORT. Soak próprio concluído: 30min reais (1801134ms), 1238 ciclos; 35 texturas/38 objetos constantes, 136–140 listeners sem acúmulo e heap após GC 7.06–8.33MiB após aquecimento. Média rAF por minuto 36.75–48.25 no stress de inventário cheio; zero pageerrors. Evidência em phase4-browser-soak.json. O aceite é local e limitado ao ambiente registrado.

Não aceita automaticamente equilíbrio orgânico de1.000, rig/aparência por item, mais biomas/pets, áudio, autoridade online ou licença comercial. Limites não removem essas metas futuras. F5 continua não iniciada.
