# Relatório da Fase4 — progressão RPG local

15/10/2026. Base: `54c615a02357df3a122b8f6da17b43fcc55e66f0`. F3 revalidada; F4 implementada, em validação final. F5 não iniciada.

## O que foi feito

- Catálogo com1.000 definições,100 bosses, curvas polinomiais limitadas após20 e XP separado do guerreiro/rei. Mesma família/bioma validada, sem alegar1.000 mapas exclusivos.
- 14 categorias,9 slots, dois anéis distintos, restrição de duas mãos/escudo,5 raridades com atributos/afixos reais. Itens únicos e rolls persistidos; inventário120, filtro e overflow controlado.
- Mochila funcional, Forja comum, ferro fundido, aprimoramento até+20 e reciclagem de não equipados. Custos visíveis e rejeição sem débito parcial.
- Musgo, slime domesticado do acervo, com sprite/idle, raridade, adoção, níveis/passivos e ativação. Dois tônicos com duração/expiração, sem empilhamento do mesmo tipo.
- Minas ouro/jade com requisitos/custos/taxas reais; carvão50 continua obrigatório para ouro. Produção e offline segmentam bônus válidos e preservam frações em BigInt/remainder.
- Save schema3 com migrações reais1/2, estado/equipados/RNG/XP/pet/buffs; progresso antigo preservado, sem loot/XP retroativos. Torre20 completa segue21.
- Guia RPG, ADR, guias de assets, roadmap/AI_STATE e demais documentos atualizados. Originais e evidências históricas F3 preservados.

## Validação da F3

Relatório específico [STAGE_03_VALIDATION](STAGE_03_VALIDATION.md). Commit publicado foi revalidado com31 testes/builds e smoke estático, CI original success confirmada. Soak30min anterior foi conferido, sem chamá-lo execução nova. Corrigida pequena inconsistência: vitalidade não ressuscita HP0 em tentativa derrotada.

## Validação da F4

| Verificação | Resultado |
|---|---|
|npm run check | Hashes/dimensões/grades, TypeScript,45 testes em6 arquivos e builds passaram |
|Assets |37 originais diretos+24 derivados,66 originais únicos/90 arquivos-fontes,278.153 bytes de autoria verificados |
|Domínio RPG | Custos exatos, rejeições,2 mãos/escudo, anéis distintos, capacidade, reciclagem/equipado, afixos, aprimoramento sem reroll e HP sem cura por troca |
|Minas/buffs | Ouro exige carvão50; jade paga ingredientes; Musgo altera taxas;10.000 passos1ms equivalem ao intervalo único atravessando expiração |
|Save | Migração2 ativa preserva batalha/recursos/níveis e resto×40.000;1→3/backup/corrupção/futuro/CAS; torre20 completa retoma21 |
|Smokes dev/produção | Ambos passaram no código final; fluxos RPG completos, sem erros de página ou respostas de assets ausentes |
|Sessão prolongada | Soak real30min em execução, Mochila cheia e ações repetidas; registrar somente ao terminar |
|CI | Pipeline executa checks, duas simulações e smokes; resultado do commit publicado no [workflow](https://github.com/marmitero/projeto-akai/actions/workflows/check.yml) |

Os smokes incluem50 ciclos,35 texturas/38 objetos,10 animações, mineração/input oculto/modal, movimento reduzido, menus/foco/tabs/scroll,320/360/390/768 e844×390 horizontal; fabricar/equipar/aprimorar/Musgo/ouro/jade/save/reload, boss deadline/treino, conclusão com Mina ativa, morte e asset ausente. Setup de estados difíceis usa snapshots locais válidos no teste, sem endpoint de grant no produto.

## Simulações

[phase4-rpg-results.json](phase4-rpg-results.json):1.000 definições válidas, máximos3.120.000HP/664ATQ/712.500Coin por morte. Fixture com nível/XP finais e arma lendária+20 atravessou todos os encontros até1000 em36.000.000ms simulados,8.388 golpes e sem overflow/reward replay. Isso prova agendas/limites, **não** uma jornada orgânica equilibrada ou prazo humano.

200.000 sorteios por fonte:1.038 drops comuns(0,519%, alvo0,5%) e19.875 de boss10(9,9375%, alvo10%). Enumeração exata dos bins condicionais5.000/3.200/1.500/280/20 em10.000 rolls. Tolerâncias documentadas nos testes. Não há pity, anúncio ou luck pago.

[phase4-loop-results.json](phase4-loop-results.json): mesma política informada de compras/treino da F3, com XP novo.1/3/5 cliques/s constantes vencem20 em575/538/538s; XP acelerou o começo e exige playtest. Perfil sem clique ainda faz retries manuais simulados e para no19; não é ausência offline. Resultados históricos F3 permanecem intactos.

## Capturas

[Equipamento](art/previews/F4_Equipment.png), [Forja](art/previews/F4_Forge.png), [Musgo](art/previews/F4_Pet.png), [Produção](art/previews/F4_Production.png) e [Batalha com companheiro](art/previews/F4_Battle.png) inspecionados no build final. Valores elevados de recursos nas capturas são fixtures controladas de teste, não promessa de renda ou recursos iniciais concedidos ao jogador.

## Decisões autônomas

Catálogo/curvas limitadas, caps locais, slots/afixos, overflow em ferro, Forja comum, custos de moeda virtual, Musgo do pack Slime, dois tônicos wall-clock, remainder exato e schema3 com migração. Preços reais, anúncios, contas ou serviços pagos não foram ativados. Detalhes em [RPG_SYSTEMS](RPG_SYSTEMS.md) e [ADR-008](ADR/0008-local-rpg.md).

## Completude e pendências

F4 funcionalmente implementada; encerrar a validação prolongada antes de concluir o relatório. Sem decisão obrigatória do usuário agora. Licenças/proveniência, playtest humano de ritmo e Android/WebGL em aparelho continuam antes da distribuição. Medição headless/software não comprova FPS de celular. Avisos conhecidos de chunk Phaser/Zod não impedem builds.

Limites explícitos: um bioma/família e um companheiro; aparência corporal-base não muda com ícones equipados; habilidades avançadas/recrutamento/mais pets e conteúdo artístico são expansões. Sem auth/banco/ledger/RNG servidor, marketplace, premium ou Ruby novos. Local não vira saldo online.

Próximo recomendado:F5 — online autoritativo, autenticação, persistência/ledger, reconexão e testes de concorrência/abuso. Preparar opções técnicas concretas antes de solicitar contratação/credenciais ou atos exclusivos do titular.
