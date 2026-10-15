# Riscos, lacunas e bloqueios

Registro inicial — 15/10/2026. Probabilidade/impacto são avaliações qualitativas de planejamento, não medições. Responsável de execução futuro: agente que assumir a fase; decisões de produto/licenças dependem do proprietário quando não houver evidência suficiente.

| ID | Risco e impacto | Prioridade | Mitigação/evidência | Gate |
|---|---|---|---|---|
| R01 | Licenças desconhecidas impedem distribuição segura | Crítica para lançamento | ASSET_LICENSES, evidência por arquivo do bundle e substituição quando necessário | Release |
| R02 | Packs com estilos e pivôs incompatíveis prejudicam combate | Alta | Subset pequeno, prévia composta e animação completa antes de integrar em escala | F2 |
| R03 | Escopo online/social/premium grande demais para primeiro ciclo | Alta | Fatia local de 20 andares com critérios próprios; preservar backlog | F3 |
| R04 | Curvas experimentais criam grind, inflação ou overflow até 1.000 | Alta | Simulador por coorte/faixa; não extrapolar fórmula inicial sem validar | F4/F8 |
| R05 | Replay, concorrência ou crash duplica saldo/item | Crítica online | Transações, constraints, claims e outbox; testes com falhas reais | F5/F7 |
| R06 | Navegação reinicia estado ou duplica timers | Alta | Domínio independente da cena, teste de 50 trocas e input isolado | F2/F3 |
| R07 | Background/relógio local concede offline indevido | Alta | Watermark atômico, cap e tempo confiável online; fixtures de relógio | F3/F5 |
| R08 | Acervo de 1,25GB provoca preload/memória excessivos | Alta | Bundle selecionado, derivados rastreáveis, profiling mobile | F2 |
| R09 | Integrações externas/configurações ainda inexistentes | Média/alta | Escolher fornecedor/versões na fase pertinente, sem simular conclusão | F5/F8/F9 |
| R10 | Regras sociais/competitivas parcialmente indefinidas | Alta para fase social | Resolver D11–D13 antes de ativar PvP/guild wars/prêmios | F6 |
| R11 | Save muda de schema e perde progresso | Alta | Versão, migrações puras, snapshot anterior e recuperação | F1/F3 |
| R12 | Debug/mocks aparecem em ambiente público | Crítica online | Flags de build + autorização server, testes de produção | F5 |
| R13 | Política de dados/moderação não definida | Alta online público | Definir público, retenção, denúncia, exclusão e acesso a dados | Público |
| R14 | Desenvolvimento continua apesar da pausa solicitada | Alta para colaboração | AI_STATE e Constituição explicitam aguardar nova instrução | Agora |

Bloqueio atual de execução: pedido explícito para aguardar após documentar. Bloqueios de lançamento: licença, conformidade e ausência de implementação/testes. Licenças pendentes não foram tratadas como resolvidas pela publicação dos documentos. Não há incidente de segurança ou perda de dados observado; riscos são prospectivos.

## Evidência após F2

R02: subset Character/Skeleton/Hud/Normal BG tem recortes, pivôs e capturas revisados, inclusive correção do chão na morte do herói; demais famílias continuam sem aprovação completa. R06:50 ciclos mantêm texturas/objetos e input isolado no smoke. R08: bundle curado~1,45MB, sem o acervo integral. R01 permanece aberto: nenhuma licença foi liberada. Teste em aparelho permanece futuro; essas evidências não substituem verificação econômica F3/online F5. A pausa histórica R14 não impede a fase explicitamente autorizada.

## F3 — riscos reavaliados

Softlock de Coin em boss20 foi reproduzido e mitigado com treino manual no19; não há farm/retry automático de boss. Fórmulas permitem concluir20 nos perfis simulados, mas começo mais rápido que hipótese e cliques contínuos não representam playtest humano. Curvas de1.000/loot/pets exigem novo trabalhoF4.

Clock local é adulterável; high-water/cap8h evitam regressão/acúmulo acidental, não anticheat. Snapshot/CAS protege duplicação persistida e concorrência, mas crash pode perder até último autosave; não existe ledger servidor. Deadline de boss continua em ausência/pausa. Licenças e perfil real Android/WebGL seguem sem comprovação.
