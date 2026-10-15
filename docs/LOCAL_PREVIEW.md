# Jogar no Windows

1. Baixe ou atualize **a pasta completa do repositório**. Se usar ZIP, extraia tudo antes; não execute dentro do ZIP nem baixe apenas o BAT.
2. Dê dois cliques em **jogar.bat**, na raiz do projeto.
3. Aguarde a preparação. O navegador padrão abrirá em **http://127.0.0.1:5173**.
4. Mantenha a janela do iniciador aberta enquanto joga. Para encerrar, use **Ctrl+C** nessa janela ou feche-a.

Requer Windows64bits (x64 ou ARM64), PowerShell5.1+ e navegador com WebGL. Na primeira execução precisa de internet e permissão de escrita na pasta: downloads do Node portátil e dos pacotes npm podem demorar. Nenhuma instalação como administrador é necessária. Acesso pode depender das regras de rede/execução do computador; em equipamento corporativo, essas regras devem ser tratadas pelo administrador responsável.

## O que é preparado automaticamente

O iniciador reutiliza Node24/npm11+ compatíveis, quando encontrados juntos. Caso contrário, baixa a versão Node indicada em .nvmrc do site oficial, confere SHA-256 com SHASUMS256.txt e mantém cópia portátil em .akai-runtime (ignorada pelo Git). O PATH é alterado apenas no processo do iniciador; não muda a instalação global do computador.

Os sprites selecionados passam pela conferência de integridade do manifesto, npm ci instala dependências de desenvolvimento se necessário, o pacote compartilhado é compilado e Vite serve o cliente. Execuções seguintes reaproveitam dependências enquanto lockfile, manifests e plataforma forem iguais; não é necessário instalar pacotes manualmente. O marcador é node_modules/.akai-preview-ready. Mudança nos arquivos de dependência causa reinstalação; instalação incompleta também exige nova preparação.

O modo **local** é forçado, mesmo que .env ou o terminal estejam em online. Não exige PostgreSQL, Google, Docker ou servidor de contas. O perfil online não é importado. Joga-se com os sprites reais do projeto, sem substituir imagens ou alterar originais. A tela indica o carregamento até o cenário ficar pronto.

## Salvamento e problemas comuns

O progresso é salvo no navegador. Use sempre o mesmo navegador/perfil e o endereço http://127.0.0.1:5173. localhost, outras portas e modo anônimo têm armazenamento diferente; limpar os dados do site pode apagar o save. O iniciador não apaga saves ao reinstalar dependências.

A porta5173 é fixa para preservar essa origem. Se estiver ocupada, feche a outra janela do preview ou o programa que a utiliza e execute de novo; o iniciador não encerra processos desconhecidos. Se o navegador não abrir automaticamente, copie o endereço exibido. Erros ficam visíveis na janela, que pausa quando não está em CI. Falta de sprites costuma indicar download/extração incompleta da pasta do projeto.

A primeira preparação usa a rede; o jogo local preparado pode funcionar sem internet enquanto as dependências continuarem intactas. Não é um instalador comercial nem um servidor acessível na rede: a escuta fica restrita a127.0.0.1.

## Verificação técnica

A CI **Windows local preview** executa o BAT real via cmd e PowerShell, em diretório com espaços e com Node portátil forçado. Primeiro prepara dependências do zero; depois roda Chromium em modo de teste, confere cenário/sprites, navega à Mina e verifica um crédito de ferro. Define VITE_GAME_MODE=online externamente para testar o override local. A instalação de Chromium é exclusiva do teste: o usuário joga no próprio navegador e não precisa baixá-lo via Playwright.

Parâmetros de diagnóstico (opcionais): jogar.bat -NoBrowser, jogar.bat -PrepareOnly e jogar.bat -SmokeTest. SmokeTest é para desenvolvimento/CI e exige Chromium do Playwright instalado; não é a opção de uso normal.

Fontes: [Node24.19.0 oficial](https://nodejs.org/dist/v24.19.0/), [API JavaScript do Vite](https://vite.dev/guide/api-javascript).

## Estado desta entrega

Publicado na main em [ab36b2e](https://github.com/marmitero/projeto-akai/commit/ab36b2e9d1532805e49cb3386a2e6a2cfc768579). [CI Windows38795097309](https://github.com/marmitero/projeto-akai/actions/runs/38795097309) aprovada: BAT real via cmd/PowerShell, diretório com espaços, Node portátil baixado/verificado, dependências do zero e reaproveitadas, cenário pronto e mineração confirmada em Chromium, mesmo com VITE_GAME_MODE externo online. Windows x64 validado; a seleção ARM64 está implementada, mas não foi exercitada nesse runner.

Conferência local de90arquivos de assets, instalação inicial de143pacotes, compilação shared, cache, HTTP, override online→local e respostaPNG também passaram. Nenhum save ou sprite original alterado. Sem pendência obrigatória do usuário para esta entrega.
