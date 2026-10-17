# servidor.bat — online com um iniciador

16/10/2026. Implementado localmente, ainda não publicado.

servidor.bat chama o bootstrap PowerShell existente em modo Online. Reutiliza Node24 portátil verificado por checksum e o cache npm; o fluxo local continua sendo o padrão de jogar.bat. O helper servidor.mjs confere Docker Compose/contexto local, tenta abrir Docker Desktop se instalado no caminho padrão, valida portas3000/5173 e binding loopback do banco, prepara dependências/sprites, inicia o serviço db do Compose, aguarda readiness e executa migrações antes de iniciar API/Vite. Abre localhost:5173 no navegador padrão.

Único pré-requisito externo: Docker Desktop instalado/configurado para containers Linux. Instalação de Docker/WSL2/componentes do sistema não é automática. Primeira preparação pode baixar Node, npm e imagem PostgreSQL16. Node global não é necessário para abrir o BAT.

Banco é o mesmo volume akai_db de desenvolvimento do compose.yaml. Nenhum reset, remoção de volume ou down é executado. Encerrar fecha cliente/API criados pelo iniciador; banco e Docker Desktop permanecem disponíveis. Dependências/cache/contas são reaproveitados. Portas ocupadas são recusadas, sem encerrar programas terceiros. Contextos Docker remotos e DOCKER_HOST remoto são recusados antes de consultar/iniciar o engine. DATABASE_URL externa é ignorada; conexão é construída a partir da configuração loopback do Compose. Monetização fica off e .env não é reescrito. Credenciais não são impressas pelo iniciador.

Parâmetros: -NoBrowser, -PrepareOnly e -SmokeTest. Este último exige Chromium de teste instalado via Playwright; cria convidado e valida cenário online/crédito de ferro. Uso normal não instala navegador de teste.

Validação executada em Linux: sintaxe Node; ausência de Docker, porta ocupada com processo preservado, binding público recusado e contexto/DOCKER_HOST remoto recusados; orquestração com CLI Docker de fixture, PostgreSQL real e API/Chromium reais. Conta online criada, sprites carregados, ferro confirmado; variáveis de modo/banco/monetização conflitantes não mudaram o fluxo. Nova preparação reaproveitou dependências e manteve contas. API/Vite foram encerrados. Regressão jogar.mjs --smoke-test passou com modo local forçado mesmo sob VITE_GAME_MODE=online.

Limitação explícita: não há Windows/PowerShell ou engine Docker neste ambiente. A CLI Docker foi simulada somente para o teste de orquestração; isso não equivale a executar servidor.bat no Windows ou baixar/iniciar um container Docker real. Os comandos seguem o Compose já versionado. Ainda é necessária validação no Windows com Docker Desktop, incluindo Node portátil, caminhos com espaços, abertura do Desktop e Ctrl+C.

Evidência: server-launcher-validation.json. Guia do usuário em ONLINE.md#iniciar-com-servidorbat-no-windows. Sem publicação externa, hospedagem, F9/P8 ou ativação de monetização.
