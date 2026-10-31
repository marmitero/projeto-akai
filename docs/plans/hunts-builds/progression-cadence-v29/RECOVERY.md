# Recuperação verificável da evidência H29 — 31/10/2026

A manutenção automática do workspace removeu fontes locais e grande parte dos dados privados. O código/protocolo continuaram preservados no GitHub. Foi criado um checkout separado, sem sobrescrever os arquivos sobreviventes; estes foram preservados em uma cópia privada persistente. A causa da remoção está agora identificada pela notificação de manutenção do ambiente.

## Evidência recuperada

- O checkpoint H29 zero de best/swift/1 estava no dia119, mas só havia um ledger diário disponível. Ele não pode ser retomado como H29 íntegra.
- Como esse braço usa exatamente o motor nativo, seu estado/trace foram usados para reconstruir a referência H26 zero correspondente e executar o último dia com o runner H26 congelado. O estado nativo completo passou e o hash final coincidiu exatamente com referenceZeroHash preservado no checkpoint original: `293bc80b0fb5910e267eb1cf4f0ee531a802f5fb7592c09c790fa6f747d4d11a`.
- O arquivo H26 balanced4213/calendar completo foi recuperado e passou em hash/schema/tempo/recursos/stats/trace. O checkpoint balanced4213/zero no dia119 foi concluído pelo runner original, reproduzindo a campanha nativa completa. A confirmação conjunta desses dois arquivos ainda exige o hash global abaixo.
- O runtime foi recompilado com dependências do lockfile. Fontes nativas/factory/modelo/protocolo relevantes coincidiram com o checkpoint; o manifesto agregado do runtime compilado mudou. Não combinar os checkpoints H29 antigos com a nova execução. A tentativa nova terá os28braços completos sob as mesmas fontes compiladas congeladas, sem mudar fórmula, taxas, casos ou gates.

Foi usado temporariamente um índice marcado `integrityPassed=false` contendo somente sete referências nativas públicas V10, com hashes dos arquivos conferidos, para validar os dois controles recuperados. Esse índice não é uma auditoria V24 e não autoriza iniciar H29. Ele será substituído somente pelo resultado real dos auditores originais após a reconstrução completa.

## Rotina sem flexibilização dos auditores

`scripts/economy-v2/recover-h29.py` executa os runners originais; não os modifica e não substitui evidência ausente por fixtures:

1. Reconstruir V22 (sete campanhas completas e dois controles curtos) e os14braços novos V24; executar os auditores originais V22/V24.
2. Restaurar/completar os28braços H26, reaproveitando apenas arquivos completos com hashes coerentes ou checkpoints aceitos pelo runner original. Executar o auditor original H26.
3. Exigir SHA-256 canônico do resumo H26 exatamente igual a `ff510f7ead1d0a136ea53e09decbbe1b8dac09642f4e16c42c0d524a15fa3f91`, já publicado em ../progression-shadow-v28/RESULTS.md. Divergência bloqueia H29; o hash esperado não pode ser trocado para acomodar resultados.
4. Somente então executar os14pares/28braços H29 de120dias. Todos os controles são novamente executados, sem presumir equivalência por endpoint.
5. Reexecutar todos os ledgers em duas auditorias completas, comparar os relatórios integralmente e executar as13adulterações/ausência/pool privados. Só depois publicar conclusões sanitizadas.

O plano contém79 tarefas de runner, das quais28 são H29 e duas são os controles curtos legados. Não confundir dias de reconstrução das referências com dias de validação H29. Nenhum resultado de balanceamento H29 foi aprovado nesta recuperação.

## Backups e retomada

A rotina exige um hook privado de backup antes de executar. Ele recebe um JSON por stdin com root/reason/phase/stateFile e só deve responder success=true após uma gravação privada persistente confirmada. Não incluir credenciais ou identificadores pessoais do destino no repositório. Backups são feitos antes do processamento, periodicamente e em cada transição de fase; falha ou resultado incerto deve bloquear a sequência para conferência.

A cópia deve incluir snapshots/checkpoints/ledgers privados e metadados de fase, sem publicar saldos, estados ou séries. Ao copiar um checkpoint H29, preservar e conferir todo seu prefixo de ledgers. Arquivos temporariamente incompletos não devem ser tratados como checkpoints válidos. Manter versões e guardas de conflito do destino privado.

```sh
python3 scripts/economy-v2/recover-h29.py --plan
python3 scripts/economy-v2/recover-h29.py --concurrency=8 --backup-hook=/caminho/privado/backup.py
```

Antes de retomar: confirmar que processos anteriores encerraram, restaurar a cópia privada mais recente e conferir fontes/hashes. O script recusa mudanças nas fontes registradas, verifica arquivos completos e só usa --resume=true com checkpoint legível; H29 também exige todos os ledgers do prefixo. Não iniciar duplicatas ou confundir metadados de runner encerrado com auditoria científica aprovada.

Os três testes novos verificam a matriz completa, o limite de concorrência/backup obrigatório e a rejeição de hash H26 diferente. São testes de controle da rotina, não substitutos das campanhas. Modelos/protocolo H29 e módulos anteriores permanecem congelados. runtimeEnabled/balanceApproved/activationReady=false; sem merge/ativação; monetização desligada.
