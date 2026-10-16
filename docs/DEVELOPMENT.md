# Desenvolvimento — MVP local F1–F4

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

Consulte [relatório da etapa](STAGE_03_REPORT.md), [arquitetura](ARCHITECTURE.md) e [AI_STATE](../AI_STATE.md). Próximo trabalho funcional é F5; não confundir local com servidor autoritativo.

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

## F4 — execução e manutenção atuais

Mochila oferece Equipamento/Forja/Companheiro; Produção desbloqueia ouro/jade. UI exibe custos/requisitos e aceita transações locais reais. Loja premium continua indisponível. Regras em RPG_SYSTEMS e estado em AI_STATE; schema3 migra1/2 sem apagar recursos. Novo config local-rpg-1, sem XP/loot retroativos. Payload/itens/referências limitados e validados.

```sh
npm run check
npm run simulate:loop
npm run simulate:rpg
node scripts/simulate-loop.mjs --write
node scripts/simulate-rpg.mjs --write
npm run test:browser:preview
npm run test:soak
```

Escritas das simulações agora vão para phase4-loop-results.json/phase4-rpg-results.json, preservando F3 histórica. Soak usa preview5185 e grava phase4-browser-soak.json:fixture rica/120 peças, compra/equipamento/reciclagem/tônicos/minas/navegação por30min. Não representa renda ou ritmo orgânico. Listeners nativos podem oscilar; critério após aquecimento é sem acúmulo(max≤base+2 e final≤base+1), além de texturas/objetos constantes e heap sem crescimento sustentado. AKAI_SOAK_MINUTES permite diagnóstico; não chamar sessão curta de30min.

CI executa checks+duas simulações+smokes dev/produção, não o soak de30min no job10min. Servidor continua503 para gameplay. Nenhum endpoint/test hook de grant é embarcado. Fontes originais intocadas; recortes/hash no manifesto runtime. Licenças, rig por equipamento e benchmark físico continuam limites explícitos.

## Atualização F5 — 15/10/2026

F5 acrescenta modo online explícito. Execução, migração separada, banco de teste, proxy e comandos em [ONLINE](ONLINE.md). Modo local permanece padrão. GOOGLE_CLIENT_ID ausente desabilita provedor; não usar credenciais fictícias como autenticação real.

## Iniciador Windows

jogar.bat na raiz prepara o runtime e abre o modo local em127.0.0.1:5173, independentemente de .env online. Sem banco externo; instalação portátil sem administrador. Uso, cache, salvamento e diagnóstico em [LOCAL_PREVIEW](LOCAL_PREVIEW.md). CI dedicada exercita BAT/PowerShell no Windows com instalação limpa e diretório com espaços.

## Atualização F6 — 15/10/2026

Servidor atualizado: executar npm run db:migrate -w @akai/server; npm run dev:server e VITE_GAME_MODE=online npm run dev:client. Mais→Comunidade abre os sistemas reais do servidor; jogar.bat permanece local. npm run test:community exige TEST_DATABASE_URL para as integrações; sem esse env são puladas explicitamente. npm run test:browser:community e :preview exigem DBisolado/Chromium e build correto. CLI community:admin e configurações em COMMUNITY_SYSTEMS; não há admin no frontend.

## Atualização F7 — 15/10/2026

Executar `npm run db:migrate -w @akai/server` antes do servidor novo (migração003 aditiva). Mais→Mercado no cliente online; `jogar.bat` preserva local. `npm run test:market` roda contratos e integração real quando `TEST_DATABASE_URL` existe; sem ele os testes PostgreSQL são explicitamente skipped e não servem de aceite. `npm run simulate:market` gera phase7-economy-simulation.json. `npm run test:browser:market` e `npm run test:browser:market:preview` usam duas contas de fixture isoladas e exigem banco; inclua install do Chromium como nos smokes anteriores.

CLI `npm run market:admin -w @akai/server -- operador UUID "Motivo com cinco caracteres ou mais"` exige DATABASE_URL e não usa cookie de jogador. Não há endpoint de concessão ou moderação. Workflow adiciona simulação e ambos os smokes do mercado com PostgreSQL16. Evidências locais e limites em STAGE_07_REPORT; não confundir execução local com CI remota.

## Atualização F8 — teste premium

Migração004 antes do servidor; default `MONETIZATION_MODE=off`, inclusive jogar.bat local. Instruções completas e separação de banco em MONETIZATION_SYSTEMS. Sandbox exige NODE_ENV=development/test, loopback, MONETIZATION_TEST_DATABASE=true e MONETIZATION_KEY privado64hex. Nunca reaproveitar esse banco para saldo real. Google-play-test exige também package e service-account file privados; não aceita recibos de compra real fora do contextoTEST.

`npm run test:premium` executa adaptadores e integração real se TEST_DATABASE_URL existir; `npm run simulate:monetization` gera parâmetros de teste; `test:browser:premium` e `test:browser:premium:preview` exercitam **simulador local assinado**, não uma conta Google/AdMob externa. CLI `premium:admin` só sandbox altera estado do provedor com motivo; restore/worker não concedem em duplicidade. Sem SDK Android nesta fase; APIs nativas/contas são dependência explícita. CI acrescenta simulador premium dev/preview e simulação, ainda sem prova externa de plataforma.
