# Continuidade e contribuição

## Antes de alterar

Ler AI_STATE, docs/README, Constituição, GDD, roadmap e documentos do domínio afetado. Verificar branch, HEAD remoto, alterações locais e instrução atual do usuário. Atualmente a tarefa termina após documentação; não iniciar implementação sem nova instrução. Preservar sprites e trabalho prévio; não reorganizar pastas por conveniência.

## Durante uma implementação futura

Trabalhar em fatias com critérios de aceite. Selecionar versões/dependências na fundação com compatibilidade/licença verificadas; lockfile e comandos reais reproduzíveis. Separar domínio/apresentação, local/online e estado/configuração. Não adicionar mocks silenciosos de produção nem endpoints administrativos sem autorização. Nunca versionar chaves ou dados pessoais reais.

Assets usam guias canônicos e subset validado; derivado registra origem/hash/transformação. Documento de design pode propor fórmula, mas não a marca como balanceada antes de simulação/playtest. Sistemas fora do MVP permanecem no backlog, não são removidos silenciosamente.

## Entrega

Descrever problema/resultado e limitações, registrar arquivos e evidências de testes apropriados. Atualizar AI_STATE e roadmap; criar ADR para decisão estrutural. Commit deve conter só o escopo da tarefa. Não alegar build/teste que não rodou; se não existe aplicação, declarar isso. Publicação externa do jogo e provisão de serviços exigem escopo autorizado; commit de documentação não equivale a deploy.

## Convenções documentais

Português pt-BR para documentação do produto, IDs técnicos estáveis e links relativos. AI_STATE.md na raiz é canônico. Estado “proposto” não é “aprovado pelo usuário”; “documentado” não é “implementado”. Se regras conflitarem, usar hierarquia da Constituição e registrar decisão sem inventar concordância. Esta etapa não cria AGENTS.md nem exige agentes paralelos.
