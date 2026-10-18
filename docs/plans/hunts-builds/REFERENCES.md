# Referências e decisões de pesquisa — 18/10/2026

Status: pesquisa de planejamento, sem implementação. Fontes consultadas diretamente; páginas e branches podem mudar. Números próprios da proposta não são taxas copiadas destes jogos. Acesso:18/10/2026.

| Fonte | O que foi aprendido | Aplicação própria / limite |
|---|---|---|
| [OpenRPG — Templates & Data](https://github.com/openrpg/OpenRpg/blob/master/docs/templates.md) e [README](https://github.com/openrpg/OpenRpg) | Separar definição estática de instância persistida; combinar atributos por efeitos e validar requisitos. | Definições versionadas de atividade/atributo/fortalecimento; instância mantém nível, dono, tentativa e histórico. OpenRPG não oferece uma curva universal de economia/fortalecimento; não copiar C# nem adicionar dependência. |
| [rAthena — configuração de combate](https://github.com/rathena/rathena/blob/master/conf/battle/player.conf) e [constantes](https://github.com/rathena/rathena/blob/master/src/map/status.hpp) | Código do próprio emulador configura cap190, distingue limites posteriores e representa ASPD por movimento/intervalo. | Derivação das constantes: movimento=2000−10×ASPD; intervalo do jogador=2×movimento, logo20×(200−ASPD)ms.190 corresponde a200ms/5ataques por segundo. Referência técnica de emulador, não afirmação de fórmula oficial de todos os servidores Ragnarok. Fórmula AGI→ASPD do Akai será própria; sem código GPL incorporado. |
| [iRO Wiki Classic — ASPD](https://irowiki.org/classic/ASPD) | Triangulação comunitária do contexto clássico e da relação hiperbólica entre ASPD e ataques/s. | Fonte secundária de contexto; a derivação técnica acima usa o código primário rAthena. Não confundir o limite clássico190 com193 de configurações posteriores. |
| [Black Desert — Aprimoramento](https://www.sa.playblackdesert.com/Pt-BR/Wiki?wikiNo=48) e [Bigorna Anciã](https://www.sa.playblackdesert.com/pt-BR/Wiki?wikiNo=395) | Proteção, perdas e consumo precisam ser explícitos; o jogo também oferece mecanismo de garantia por esforço acumulado. | Adotar transparência e simular consumo/cauda. Não copiar tabelas, produtos, preços ou garantia automática. A proteção Akai converte quebra em−1, conforme usuário, não replica todos os efeitos das Pedras Cron. |
| [MapleStory — guia oficial Star Force](https://support-maplestory.nexon.com/hc/en-us/articles/204088639-How-do-I-enhance-equips-with-Star-Force) | O artigo descreve sucesso, permanência, regressão e destruição, proteção, marcos e mecanismos de garantia. | Taxonomia de resultados para interface e auditoria. O artigo mistura regras que mudaram ao longo do tempo; não usar suas taxas/marcos como tabela vigente nem transplantar o sistema para Akai. Nossa curva não herda Chance Time ou pisos. |

## Síntese autoral

ASPD, fortalecimento e preço de mercado precisam de modelos separados. ASPD190/200ms é um limite verificável; o caminho AGI→190 não vem pronto da referência. Probabilidade de +20 não é probabilidade da última tentativa: regressões, destruições, disponibilidade de base lendária, material e proteção mudam o esforço acumulado.

Escassez não garante preço alto: demanda por build/nível/afixos, oferta renovável, horizonte do servidor e sumidouros também importam. Não estimamos valor monetário ou rentabilidade.

A referência à garantia de Black Desert/MapleStory foi estudada, mas **não incluída na candidata numérica** para não diluir silenciosamente a raridade desejada. Uma eventual garantia requer nova simulação e decisão de design. Pesquisa não autoriza ativar monetização: a venda por Ruby foi aceita para o plano; integração comercial continua na fase final.
