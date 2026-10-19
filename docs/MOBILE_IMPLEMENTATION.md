# Etapa Android LAN — implementação e evidências

## Entrega

`celular.bat` reutiliza o bootstrap Windows de Node24/dependências e a inicialização Docker/PostgreSQL/API do servidor existente. O novo preview serve **somente cliente compilado** na interfaceIPv4 privada escolhida. O navegador do PC abre uma página de conexão com QR Code e link; o telefone joga pelo Chrome na mesma rede. `jogar.bat -Mobile` oferece o teste local sem Docker. Os iniciadores antigos continuam locais por padrão.

- API e PostgreSQL mantidos em loopback; apenas5173 é servido na LAN.
- QR gerado no próprio computador, sem serviço externo e sem token de conta.
- Opt-in de LAN restrito a desenvolvimento, origem privada canônica, Host/Origin exatos, Google/monetização off. Encaminhamento apenas da API existente; modo local não encaminhaAPI.
- Cliente compilado em diretório temporário próprio; encerramento fecha sockets/preview/API próprios e remove esse diretório. Banco e volumes preservados.
- UUIDv4 via CSPRNG e SHA256 compatíveis comHTTP por IP; formato/checksum dos saves preservados. Nenhuma troca para `Math.random`.
- Áreas de toque maiores, safe-area e viewport preparados para interface mobile/teclado. Nenhuma fórmula de combate/economia foi alterada.

## Verificações

Typecheck/build aprovados. Testes locais semPostgreSQL:85testes/14arquivos, incluindo6novos de configuração e criptografia;4testes Node de rede/adaptadores também passaram. Suíte completa comPostgreSQL16 e testes Windows são executados na CI da [PR5](https://github.com/marmitero/projeto-akai/pull/5); os checks dessa PR identificam o SHA exato validado.

O smoke mobile usa o preview compilado real. Conta de convidado, cookie, WebSocket, comando de mineração confirmado, recarga e recuperação da mesma conta são verificados no modo online com banco de teste isolado. A emulação passa por320×640,360×800,390×844,412×915e844×390, navegando porBatalha/Mina/Melhorias; não pode criar overflow horizontal ou canvas duplicado. O modo local salva explicitamente antes da recarga. QRrenderiza320px, e o teste local decodificou oPNG para conferir o endereço exato.

O navegador opera como contextoHTTP **não seguro**, com `randomUUID` e `subtle` ausentes, sem flags que os habilitem artificialmente. No ambiente local de execução não há interfaceLAN utilizável; a prova local usa origemIP privado e proxy de teste fixo em loopback. A CI usa uma interface privada real do runner. Esse proxy não faz parte do iniciador nem abre acesso a destinos arbitrários.

Windows: workflow executa `jogar.bat -Mobile -NoBrowser -SmokeTest -LanIp ENDERECO` pelo BAT real, com Node portátil e dependências em pasta com espaços. Esse teste valida o caminho mobile local; não significa que Docker Desktop/servidor online completo foi executado no Windows. Online/API/PostgreSQL16 são exercitados no runnerLinux.

Teste em **Android físico, câmera, firewall/roteador, teclado e bateria** continua necessário. Não háAPK, PWA/instalação offline, Google noHTTP LAN ou infraestrutura pública nesta etapa. APIs dependentes deHTTPS fora do escopo permanecem fora; não tratamos esse preview como hospedagem de produção.

## Reprodução

```sh
npm ci
node --test scripts/tests/mobile-network.test.mjs
npm run check
npx playwright install --with-deps chromium
node scripts/smoke-mobile.mjs
TEST_DATABASE_URL=postgres://USUARIO@127.0.0.1:5432/BANCO_DE_TESTE node scripts/smoke-mobile.mjs --online
```

`--loopback-alias` permite reproduzir a prova deHTTP porIP sem uma interface privada no executor. `AKAI_CHROMIUM_EXECUTABLE` seleciona navegador instalado para o teste; `AKAI_JSQR_MODULE` opcional aponta a um decodificador independente deQR, usado na validação local. Nenhuma dessas opções é necessária ao jogador.

Evidência local em `mobile-local-validation.json`. Smokes online e BAT são obrigatórios na CI; não foram substituídos por mocks de banco ou por uma página desktop emlocalhost. A evolução da nova economia permanece na branch de calibração, com o gate de completude pendente. [Guia do jogador](MOBILE_TEST.md) · [sequência recomendada](PROJECT_NEXT_PHASES.md).

Referências de compatibilidade: [MDN/getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues), [MDN/randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID), [node-qrcode](https://github.com/soldair/node-qrcode).
