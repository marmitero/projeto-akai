# ADR-003 — Save versionado e ausência

Data: 15/10/2026. Estado: **adotado experimentalmente e implementado em F1/F3**; cap não é regra definitiva do usuário. Detalhamento em ADR-007.

## Contexto

Trocar de tela, ocultar app e desconectar são situações diferentes. Timers do navegador podem parar; contar frames ou confiar em relógio local online permite inconsistências.

## Decisão proposta

IndexedDB para save local atômico com versão, backup anterior e migrações puras. Domínio local grava checkpoint e settledAt de minas. Na ausência real, calcular apenas produção de minas até oito horas (cap experimental), segmentando buff/configuração vigente. Combate/andares/drops/cliques não avançam offline no MVP. Timer de boss já iniciado preserva deadline: ao retornar após prazo, falhar sem reiniciar. Conta online usa timestamp e watermark do servidor; não aceita save local como economia confiável.

Navegação interna não é ausência. Regresso de relógio local produz zero, nunca saldo negativo; avanço local exagerado continua limitado ao cap, sem promessa de anticheat. Grant e watermark confirmam juntos, para que crash/retry não repitam produção.

## Alternativas e consequências

Simular cada segundo de ausência é caro e não resolve crédito duplicado. Continuar batalha offline exige modelo econômico e de derrota que ainda não foi especificado; adiar esse comportamento preserva simplicidade do primeiro loop. localStorage é possível para dados pequenos, mas não oferece o mesmo envelope transacional de snapshot/backup. IndexedDB aumenta código de migração e tratamento de quotas. Offline não depende do unload funcionar. Ver DATA_MODEL, ECONOMY e TEST_PLAN.
