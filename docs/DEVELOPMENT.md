# Desenvolvimento — MVP local F1–F3

Implementação em 15/10/2026. MVP local jogável, com 20 andares, ferro/cliques/melhorias/carvão e save/offline. Não foram contratados serviços, configuradas contas ou publicados aplicativos.

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

## O que a F3 faz

HUD/telas Batalha/Mina/Produção com sprites; batalha automática3×3, bosses10/20, prazo30s, transição3s/Run, pausa/retry/treino manual. Ferro por clique, força/vitalidade/picareta e carvão em Produção; taxas/custos/vida na UI. Tutorial curto retomável. Mais mantém perfil/salvamento/recursos; Mochila/Loja ainda sem sistemas. Até419px são quatro atalhos e os demais ficam em Mais; Escape fecha/retorna.

Save IndexedDB versionado com SHA-256 para corrupção acidental, geração concorrente, cópia anterior e quarentena na recuperação explícita. Save futuro/config incompatível bloqueia gravação. Corrupção não apaga silenciosamente o arquivo; se houver backup, só restaura ao clicar no botão. Dois escritores da mesma geração não podem confirmar juntos; aba obsoleta precisa recarregar. SHA-256 não é anticheat. Armazenamento indisponível é mostrado como sessão temporária.

Schema2/local-loop-1 migra a versão real1/foundation-1 após validar checksum original. Preserva perfil, saldos, tela, activeMs e geração; inicia a torre no1 porque não havia combate anterior. Novo save inclui HP/cooldowns/ondas/timer, níveis, tutorial, remainder e watermark. Minas conciliadas até 8h uma vez; boss pode expirar ausente, sem vitória/clique/drop offline. Pause manual não suspende prazo de boss. Stall visível>5s segue ausência. Não transportar save local para conta online.

Autosave15s, boot/retomada/compras/ações de batalha e tentativa em ocultação/pagehide; fechamento abrupto pode perder ações do último intervalo. Resumo offline já está creditado. Em conflito de aba, recarregar; não há import/export ou ferramenta para apagar save silenciosamente.

## Testes e CI

Vitest: contratos de saldo/comando, navegação/lifecycle, cópia de estado, save/backup/corrupção/versão futura/concorrência e servidor HTTP/configuração. fake-indexeddb só é dependência de teste; verificação não substitui testes em navegadores reais. Workflow `.github/workflows/check.yml` instala com npm ci e executa npm run check; execução remota não é presumida só por versionar YAML.

Consulte [relatório da etapa](STAGE_03_REPORT.md), [arquitetura](ARCHITECTURE.md) e [AI_STATE](../AI_STATE.md). Próximo trabalho funcional é F4; não confundir local com servidor autoritativo.

## Smoke de navegador (opcional)

```sh
npx playwright install chromium
npm run test:browser
```

Playwright é dependência apenas de desenvolvimento. O smoke sobe Vite local nas portas 5182/5183 e as encerra ao terminar; essas portas precisam estar livres. Valida canvas, 50 ciclos entre destinos, salvar/recarregar, larguras 320/360/390/768 e bloqueio do modo online. Em um ambiente com Chromium já instalado pode usar AKAI_BROWSER_EXECUTABLE para apontar o executável. No ambiente desta entrega o download padrão do navegador falhou; a execução usou um Chromium headless temporário, fora do projeto, com renderização por software. Isso não substitui teste Android/WebGL em aparelho.

## Assets e verificação visual

`npm run check` também executa `npm run check:assets`, validando os hashes do registro curado. Derivados PNG em apps/client/src/assets/derived já estão versionados; gerar build não requer Pillow. Para alterar recortes, usar `python scripts/prepare-visual-assets.py` (Pillow), revisar imagens e o JSON docs/art/Runtime_Asset_Manifest.json. Nenhum original deve ser sobrescrito.

`npm run test:browser:preview` compila e verifica também o build estático. O smoke cobre nove animações, morte real,50 ciclos sem crescimento de objetos/texturas, mineração, compras/carvão, offline/reload, timer/treino de boss e conclusão com Mina ativa, input/modal, foco e larguras. Capturas opcionais com AKAI_SCREENSHOT_DIR. As rotas e saldos continuam locais; melhorias de moeda virtual e carvão locais estão ativos; loja premium continua indisponível.

## Economia e sessão prolongada

```sh
npm run simulate:loop
# Grava evidência determinística após build shared:
node scripts/simulate-loop.mjs --write
# Soak de 30min do build estático (Chromium instalado):
npm run test:soak
```

Simulação testa políticas ativas1/3/5 cliques/s e perfil sem clique; falha se um perfil ativo não alcançar20. Números não representam playtest humano. Soak serve Vite preview na5184, mede heap após GC, listeners/DOM, objetos/texturas e média rAF por minuto, com compras/mineração/navegação. Saída docs/phase3-browser-soak.json. AKAI_SOAK_MINUTES altera a duração para diagnóstico; somente30min atendeM14. Soak não roda no job CI de 10min; CI executa checks, simulação e smokes dev/produção. Sem runtime/dependência de teste embarcada no produto.
