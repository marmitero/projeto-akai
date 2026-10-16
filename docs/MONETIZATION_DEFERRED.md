# Monetização — pendências adiadas para a fase final

Decisão explícita do usuário em 16/10/2026: publicar a base técnica da Fase 8, priorizar os polimentos do jogo e retomar a integração/ativação de monetização somente na fase final. A preparação técnica publicada permanece desligada por padrão. O simulador não comprova homologação de Google Play ou AdMob. Não iniciar a F9 automaticamente para resolver estas pendências.

| Pendência preservada | Retomada / evidência necessária |
|---|---|
| Play Console: package/app, produtos, license testers e acesso da service account | Titular configura a conta; credenciais somente em canal privado/ambiente seguro, nunca no Git ou chat. Validar produtos e conta de teste reais. |
| Cliente Android: checkout, query, restauração e vínculo de conta | Implementar ponte nativa; obter tokens reais de licença-teste e exercitar compra pendente/cancelada, reinício, restauração, consumo/ack e estorno. |
| AdMob: conta, unidades, SDK, transporte SSV, chaves e consentimento | Integrar SDK/callback, validação e rotação de chaves; provar uma recompensa legítima e rejeitar replay no ambiente de teste do provedor. As fixtures criptográficas atuais não substituem esse teste. |
| Catálogo comercial e economia | Definir preços, quantidades e produtos finais; decidir separadamente qualquer poder permanente, conversão premium ou baú pago. Os quatro pacotes atuais são experimentos sem preço real; Ruby negociável continua desativado. |
| Bônus voluntários e equilíbrio | Rever limites, cooldowns, duração e efeito indireto na progressão após playtests; não presumir equilíbrio competitivo a partir da simulação. |
| Gates de lançamento | Revisar políticas vigentes na ocasião, privacidade/consentimento, público, licenças, aparelhos, carga, suporte, observabilidade e reconciliação operacional antes de ativar. |

Referências técnicas: [MONETIZATION_SYSTEMS](MONETIZATION_SYSTEMS.md), [ADR-012](ADR/0012-monetization-test-boundary.md), [relatório F8](STAGE_08_REPORT.md). O trabalho atual é o [plano de polimentos](POLISH_PLAN.md); nenhuma conta, gasto, anúncio ou pagamento real foi ativado por esta publicação.
