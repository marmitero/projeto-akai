# Projeto Akai — continuidade e publicação

Leia `AI_STATE.md` e os documentos da etapa antes de alterar o jogo.

## Regra permanente do usuário (18/10/2026)

Ao concluir cada etapa: executar as validações pertinentes, registrar evidências, criar commit e publicar no GitHub. A autorização é permanente; não solicitar confirmação de publicação a cada etapa. Em trabalhos longos, salvar checkpoints em branch remota para que uma perda do workspace não elimine o progresso.

Preservar o histórico: preferir rollback por `git revert`, sem force-push ou apagamento de versões. Não integrar à main código com falhas conhecidas de validação; nesse caso, publicar o checkpoint na branch, corrigir e informar o estado real. Confirmar o SHA remoto antes de declarar publicado. Commit apenas local não conta como publicação.

Publicação aqui significa código no repositório, disponível para playtest com `jogar.bat` ou `servidor.bat`; não autoriza gastos ou abertura de infraestrutura pública.

Bosses não fazem parte da etapa de bestiário comum. Monetização permanece adiada até a fase final.
