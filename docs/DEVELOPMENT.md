# Desenvolvimento — fundação F1 e prévia visual F2

Implementação em 15/10/2026. Este é um ambiente interno de prévia visual interativa; o loop econômico/jogável ainda não existe. Não foram contratados serviços, configuradas contas ou publicados aplicativos.

## Ambiente e comandos

Node 24 (execução validada com 24.19.0), npm 11 (11.9.0 no teste). `.nvmrc` registra runtime; package-lock.json fixa versões resolvidas. Na raiz:

```sh
npm ci
npm run check
npm run dev:client
```

Cliente em http://127.0.0.1:5173. Em outro terminal:

```sh
npm run dev:server
```

Servidor em http://127.0.0.1:3000. `GET /health` retorna diagnóstico real com onlineGameplay=false. Rotas `/api/v1/*` retornam 503 ONLINE_NOT_AVAILABLE: autenticação/economia online ainda não existem.

Comandos separados: `npm run typecheck`, `npm test`, `npm run build`. Typecheck inclui aplicativos, shared, testes e configs. O shared é compilado antes dos consumidores. Após build: `npm run preview -w @akai/client` serve cliente estático e `npm start -w @akai/server` executa dist do servidor. Não executar o servidor TypeScript diretamente em produção. Alterações em shared durante dev exigem recompilar/reiniciar o comando raiz.

## Configuração e isolamento

Copiar `.env.example` para `.env` local somente se precisar alterar padrões. Servidor lê `.env` da raiz via flag nativa do Node; Vite usa envDir da raiz. HOST padrão 127.0.0.1, PORT 3000, LOG_LEVEL info. VITE_GAME_MODE=local é o único modo implementado; outro valor bloqueia boot e não troca silenciosamente para local. Nunca colocar segredo em variável VITE_: ela pode ir para o navegador. `.env` e builds/node_modules estão ignorados.

## O que a prévia F2 faz

HUD e telas Batalha/Mina/Produção com sprites reais; páginas de Mochila/Loja ainda sem sistemas e menu Mais com perfil/salvamento/recursos. Ataques/derrota e impactos de mineração são demonstrações, sem reduzir HP ou conceder recursos. Texto de prévia identifica esse limite. Até419px a barra mostra Batalha/Mina/Produção/Mais; Mochila/Loja continuam acessíveis por Mais. Escape retorna das páginas auxiliares e fecha modais.

Save IndexedDB versionado com SHA-256 para corrupção acidental, geração concorrente, cópia anterior e quarentena na recuperação explícita. Save futuro/config incompatível bloqueia gravação. Corrupção não apaga silenciosamente o arquivo; se houver backup, só restaura ao clicar no botão. Dois escritores da mesma geração não podem confirmar juntos; aba obsoleta precisa recarregar. SHA-256 não é anticheat. Armazenamento indisponível é mostrado como sessão temporária.

Schema1 é a primeira versão real; não havia save anterior publicado. Não foi inventada migração fictícia: versões desconhecidas são preservadas/rejeitadas até existir transformação aprovada/testada. Futuras migrações precisarão de fixture de schema real. Não transportar save local para conta online.

## Testes e CI

Vitest: contratos de saldo/comando, navegação/lifecycle, cópia de estado, save/backup/corrupção/versão futura/concorrência e servidor HTTP/configuração. fake-indexeddb só é dependência de teste; verificação não substitui testes em navegadores reais. Workflow `.github/workflows/check.yml` instala com npm ci e executa npm run check; execução remota não é presumida só por versionar YAML.

Consulte [relatório da etapa](STAGE_01_REPORT.md), [arquitetura](ARCHITECTURE.md) e [AI_STATE](../AI_STATE.md). Próximo trabalho é integração visual F2; não confundir a tela interna desta fundação com o layout final do RPG.

## Smoke de navegador (opcional)

```sh
npx playwright install chromium
npm run test:browser
```

Playwright é dependência apenas de desenvolvimento. O smoke sobe Vite local nas portas 5182/5183 e as encerra ao terminar; essas portas precisam estar livres. Valida canvas, 50 ciclos entre destinos, salvar/recarregar, larguras 320/360/390/768 e bloqueio do modo online. Em um ambiente com Chromium já instalado pode usar AKAI_BROWSER_EXECUTABLE para apontar o executável. No ambiente desta entrega o download padrão do navegador falhou; a execução usou um Chromium headless temporário, fora do projeto, com renderização por software. Isso não substitui teste Android/WebGL em aparelho.

## Assets e verificação visual

`npm run check` também executa `npm run check:assets`, validando os hashes do registro curado. Derivados PNG em apps/client/src/assets/derived já estão versionados; gerar build não requer Pillow. Para alterar recortes, usar `python scripts/prepare-visual-assets.py` (Pillow), revisar imagens e o JSON docs/art/Runtime_Asset_Manifest.json. Nenhum original deve ser sobrescrito.

`npm run test:browser:preview` compila e verifica também o build estático. O smoke cobre agora oito animações, conclusão de derrota,50 ciclos sem crescimento de objetos/texturas, bloqueio de input, saldos zero, menus/foco, erro de asset e fallback estreito. Capturas opcionais com AKAI_SCREENSHOT_DIR. As rotas e saldos continuam locais; nenhuma compra ou automação real está disponível.
