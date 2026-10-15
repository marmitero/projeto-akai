# Checklist de release

Todos os itens de produto abaixo estão **pendentes**. Documento não certifica lançamento. Escopo de release deve indicar local interno, online fechado ou público/Android; cada um tem gate próprio.

## Revisão documental desta etapa

- [x] Master Prompt e guias de assets existentes preservados.
- [x] Constituição, GDD, roadmap, arquitetura, economia, dados, API, segurança, UX e planos preparados.
- [x] Regras aprovadas e decisões provisórias distinguidas.
- [x] AI_STATE registra parada solicitada antes de implementar.
- [x] Verificação estrutural/links registrada em AI_STATE; identificação da entrega pelo histórico Git e mensagem final.

## MVP local interno

- [ ] F1–F3 e M01–M15 aceitos com evidência.
- [ ] Build/test/typecheck reproduzíveis e executados no commit da release.
- [ ] Save/backup/migrações e retorno offline verificados.
- [ ] Navegação/ondas/boss/input sem duplicação.
- [ ] Subset artístico com recortes/pivôs e uso permitido para o contexto de distribuição.
- [ ] Bugs/limitações documentados; perfil/debug locais rotulados.

## Online fechado/público

- [ ] Auth/autorizações, reconexão, replay, concorrência, ledger e outbox verificados.
- [ ] Save local não concede saldo online; debug protegido.
- [ ] Banco/migrações/backups/restore e incidente ensaiados.
- [ ] Desempenho/carga com aparelho/hardware/cenário registrados.
- [ ] Moderação, privacidade, retenção e exclusão de conta definidos.
- [ ] Licenças de todos os assets/fonts/sons/libs distribuídos confirmadas e créditos incluídos.
- [ ] Curvas/drops/economia simulados e avaliados por playtest; sem promessas de equilíbrio não medidas.
- [ ] Domínios/HTTPS/origens/segredos/ambientes/alertas revisados.

## Monetização e Android

- [ ] Provedor e SDK atuais verificados em documentação oficial na data da integração.
- [ ] Compras sandbox, pendência, restauração, reembolso/revogação e recibo repetido testados.
- [ ] Anúncios voluntários e concessões verificadas sem interrupção indevida.
- [ ] Preços/catálogos/moedas e informações exigidas pela plataforma revisados.
- [ ] Ciclo Android: background/foreground, interrupção, rede, teclado, áudio, memória e safe areas.
- [ ] Políticas vigentes da loja, classificação etária e declarações de dados verificadas antes de submeter.
- [ ] Artefato assinado, acesso restrito às chaves, plano de rollout/rollback e suporte.

Publicar somente o artefato testado e identificado. Esta documentação não autoriza envio à Google Play, compras reais, contratação de serviços ou migração de produção.

## Evidência de fundação F1

F1 possui builds/testes e smoke conforme STAGE_01_REPORT. Isso não marca os checkboxes do MVP local completo, online ou lançamento: M02–M15 incluem gameplay/arte que ainda não existem. Workflow CI adicionado, execução remota só pode ser confirmada após consulta ao run efetivo.

## Evidência visual F2

Telas, HUD, oito animações, input e build estático testados conforme STAGE_02_REPORT. Loja, mineração/produção econômicas e combate continuam pendentes para MVP; licenças/Android/online continuam pendentes para lançamento. Nenhuma publicação comercial realizada.

## Situação F3 (não é release público)

Loop local1–20, carvão/offline, migração real/save e regressões testados; CI própria só confirmar por run efetivo. Não ativados auth/banco/loja premium/anúncios/online. Licenças de sprites, teste de aparelho, playtest humano e demais gates desta checklist continuam necessários antes da distribuição. ConcluirF3 não autoriza marcar checklist comercial completa.

## Situação F4 — não é release público

RPG local implementado/testado, catálogo1.000 e migrações/simulações; confirmar CI do commit publicado. Sem auth/banco/ledger/premium/anúncios. Licenças, jornada orgânica/playtest e aparelhos continuam necessários antes de distribuição. Não marcar checklist comercial pronta pela existência de equipamento/loja/guia ou simulação com fixture final.
