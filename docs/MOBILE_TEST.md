# Testar no Android pelo Wi-Fi

## Início rápido

1. Atualize/baixe o projeto completo no computador Windows.
2. Conecte computador e Android à mesma rede local. O PC pode estar no cabo se o roteador compartilhar a rede com o Wi-Fi.
3. Feche outro `jogar.bat`/`servidor.bat` aberto para liberar as portas. Dê dois cliques em **celular.bat**.
4. Aguarde Node/dependências/sprites, Docker Desktop/PostgreSQL, API e compilação do cliente. A primeira execução precisa de internet e pode demorar.
5. O navegador do PC abre a página **Akai no celular**, com QR Code e endereço `http://IP_DO_PC:5173`. Escaneie pela câmera do Android e abra no Chrome; também é possível digitar o endereço.
6. Crie um convidado ou recupere a conta usando sua chave. Mantenha PC, Docker e a janela do iniciador abertos. Ctrl+C encerra o jogo/API e preserva o banco.

É o mesmo modo online de `servidor.bat`. Docker Desktop com containers Linux precisa estar instalado; Node24 portátil é preparado automaticamente quando necessário. Não precisa digitar comandos PowerShell. Ainda é um teste pelo navegador: sem APK, serviço de instalação, hospedagem externa ou PWA offline.

## Contas e progresso

As contas online ficam no PostgreSQL do computador. A conta usada em `localhost` não aparece automaticamente no endereço por IP, porque cookies são separados por endereço. **Use a chave de recuperação para entrar na mesma conta**. Recuperar a conta troca a chave anterior; guarde a nova chave exibida e evite usá-la simultaneamente em vários aparelhos. O QR contém apenas o endereço do jogo, nunca chave, token ou credencial do banco.

O perfil local de `jogar.bat` continua separado do online. Para um teste só de interface, sem Docker, também é possível executar `jogar.bat -Mobile`: ele mostra QR para um perfil local do navegador do celular. Nesse modo, use Mais → Salvar perfil local antes de fechar; o autosave periódico e o armazenamento pertencem àquele navegador/endereço. Trocar IP, navegador ou limpar dados pode tornar esse perfil local inacessível; não é sincronização de conta.

## Se não conectar

- No aviso do Firewall do Windows, permita Node.js **somente em redes privadas**. O iniciador não desativa o firewall nem cria regra administrativa automática.
- Confira se a rede do Windows está classificada como privada e se celular/PC estão na mesma rede. Wi-Fi de visitantes, isolamento de clientes, VPN, dados móveis e alguns repetidores impedem comunicação entre dispositivos.
- Use o endereço mostrado, não `localhost` no celular. `localhost` apontaria para o próprio telefone.
- O IP pode mudar quando o PC reconecta. Reinicie o iniciador e escaneie o QR novo.
- Se houver mais de um adaptador, o iniciador prefere Wi-Fi. Em ambiguidade, mostra os endereços disponíveis. Escolha explicitamente com `celular.bat -LanIp 192.168.1.20`, usando o IPv4 real do seu computador. O parâmetro também funciona em `jogar.bat -Mobile -LanIp ENDERECO`.
- Porta ocupada: feche a janela anterior. Não execute dois iniciadores ao mesmo tempo. Mantenha o Docker Desktop pronto antes de tentar novamente.

## O que é exposto

Só a interface privada escolhida, porta5173, serve o **cliente compilado** e encaminha `/api/v1` à API em127.0.0.1:3000. O PostgreSQL continua em127.0.0.1:5432; nenhuma credencial do banco é entregue ao navegador. O servidor de desenvolvimento Vite, fontes e arquivos de configuração não são servidos na LAN. O preview temporário é removido no encerramento normal; uma queda abrupta pode deixar apenas arquivos compilados temporários, sem banco.

O opt-in `LAN_PREVIEW=true` só permite origemHTTP canônica RFC1918 em desenvolvimento/teste, API loopback, Google desativado e monetização off. Host/Origin precisam corresponder ao IP escolhido; origens externas e clientes de IP público são rejeitados. O fluxo usa HTTP e destina-se à sua rede privada confiável. Não encaminhe portas no roteador. Internet/Google/PWA instalável exigirão outra etapa comHTTPS e implantação apropriada.

No HTTP por IP, o Chrome não disponibiliza `crypto.randomUUID`/`crypto.subtle`. O cliente mantém IDsv4 criptograficamente aleatórios via `getRandomValues` e o mesmo checksumSHA256 via implementação empacotada quando necessário. O formato dos saves e as regras de recompensa não mudam.

## Validação desta etapa

Testes cobrem guarda de rede/configuração, checksum idêntico nativo/fallback, adulteração de save, IDs de comando, QR/endereço, toque, recarga, cinco resoluções e ausência de vazamento de arquivos. O smoke online usa PostgreSQL real na CI, convidado/recuperação, comando confirmado e WebSocket pelo mesmo endereço. O Windows executa o BAT real com Node portátil e interface privada. Evidências e limitações no [relatório](MOBILE_IMPLEMENTATION.md).

Ainda é necessário testar no **seu aparelho Android físico**: leitura do QR pela câmera, permissões do firewall/roteador, teclado virtual, retorno do segundo plano, rotação e fluidez/bateria. Emulação não certifica esses itens.

[Próximas fases recomendadas](PROJECT_NEXT_PHASES.md).
