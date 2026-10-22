# Fase 5 / V14 — mercado autenticado: resultados

22/10/2026. Concluída para o ensaio autenticado isolado de2–20participantes. Não aprova liquidez, produção pública, migração de contas reais ou capacidade global.

## Implementado

- POST test-v2/market deriva ator e mercado da sessão/pins; reutiliza carteira, revisão e escritor SQL de economia/eventos.
- SQL009 fixa um mercado imutável com roster exato da autoridade V13, sem autoinscrição/reset público.
- Revalidação de sessão e acesso após locks/antes de replay; contrapartes desabilitadas/suspensas e participação em evento impedem novas transferências.
- GET consistente e sem escrita econômica, expiração atual projetada, sem IDs privados de run/realm, RNG ou carteiras alheias; ofertas e histórico só das partes.
- Interface online para anúncio de item/material, compra, ofertas completas, cancelamento/resgate, revisão de preços/taxas, busca/filtros/páginas e histórico próprio.
- Intenção salva por conta antes de enviar; resposta perdida/recarga repete o mesmo comando, sem novo débito. Stale/settling exigem nova decisão, sem compra automática.
- Taxas/fontes/regras v2 e artefatos V10/V11/V12 preservados; mesma instância mantém ID/origem/qualidade/refino.

## Evidência final

Candidato `000ed61d0fbd07d49e7760d8ee6aff8cc0f035a4`, árvore `afdee3e56447fdaf082fb6c8687a93dd1eea90ec`, [PR24](https://github.com/marmitero/projeto-akai/pull/24). [CI39810570092](https://github.com/marmitero/projeto-akai/actions/runs/39810570092) e [Windows39810570094](https://github.com/marmitero/projeto-akai/actions/runs/39810570094).

- CI:316testes em36arquivos com PostgreSQL16, sem skips;13casos SQL novos, incluindo revogação de sessão e de membro durante espera, concorrência de compradores, replay divergente, relógio monotônico, privacidade, fundos de oferta, expiração/resgate/cooldown, suspensão/eventos, backlog e rollback de outbox/ledger/fees/recibo.
- Tipos, assets e builds passaram;19testes Node adicionais (6campanha,1integridade,4liquidez,4população,4rede). Auditorias R2–R8/mercado/V9/readiness e replays V10/V11/V12 passaram.
- Browser dev e build/preview, desktop1280px/mobile390px: compra com resposta perdida e reload resulta em uma transferência/recibo; revenda por oferta preserva a peça exata; retirada/recusa/aceite, cancelamento/resgate/cooldown e expiração73h passaram. DTO sem IDs privados/segredos, sem overflow/pageerrors e conta legada preservada.
- Regressões do jogo local/online, economia/offline/eventos, comunidade, mercado legado e premium de teste passaram em dev/preview.
- Windows: preparação e execução pelos BAT reais, dependências novas/cache, Node portátil e LAN passaram. Não houve teste em Android físico.

O primeiro checkpoint passou314testes/36arquivos, mas seu browser falhou ao exigir Coin legado zero depois de avançar73h: a conta de fixture ainda tinha combate legado ativo e ganhou3Coin normalmente. A fixture final pausa somente esse combate antes do teste para medir isolamento; não muda runtime/grants ou reduz a verificação de saldo. O driver também passou a aguardar a revisão realmente renderizada após GET. A rodada seguinte passou316testes e todos os smokes anteriores, mas o último V14 preview tentou anunciar logo após aceite pela contraparte sem atualizar a revisão; o servidor recusou corretamente STALE_REVISION. O driver final atualiza explicitamente essa conta antes de revisar o próximo anúncio, sem retries financeiros automáticos ou alteração do runtime. A interface final identifica também o bem nas ofertas e na revisão de publicação. Os13testes SQL verificam reconciliação e preservação do snapshot legado completo em schemas isolados.

Localmente tipos/build/assets e169testes passaram;145PostgreSQL foram omitidos no primeiro checkpoint por falta de banco local. A comprovação completa do candidato final é a CI acima, com316testes e zero skips. Fixtures SQL/browser são técnicas, sintéticas e isoladas; não representam aquisição aprovada, população real ou demanda.

O fechamento posterior altera somente documentação; código, SQL, testes, scripts, workflow e JSON permanecem idênticos ao candidato validado.

## Operação e próximos passos

Procedimento e API em [IMPLEMENTATION.md](IMPLEMENTATION.md) e [API](../../../API.md). Acesso: Mais→Ensaio online v2→Mercado online v2 de teste, após vínculo operacional no banco isolado.

Próximo consumidor: arena autenticada; depois guildas/temporadas, com a mesma identidade/carteira. Continuam pendentes calibragem Coin/Força/HP/Jade/refino, coortes de liquidez/população, retenção/capacidade entre instâncias, corte/backup/reconciliação/rollback e playtest gratuito. Economia real, +16–20 e monetização off. Nenhuma decisão adicional do usuário bloqueia esta etapa técnica.
