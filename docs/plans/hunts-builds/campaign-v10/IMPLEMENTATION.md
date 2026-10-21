# Fase 1 — campanha adquirida (em validação)

A campanha começa no nível 1 com a espada inicial e zero recursos externos. Todas as compras, equipamentos, refinos, descartes, avanços e ausências passam pelos mesmos motores puros usados na prévia v2. Não há preset, mercado com comprador infinito, Ruby, Jade gratuita nem +16–20. População/Jade e liquidez são fases posteriores.

Rotinas comparadas: 24h ativas, 16h ativas + 8h offline, 2h ativas + 8h offline (14h restantes sem renda). O controlador atua a cada cinco minutos; a demora de recuperação após derrota conta como tempo perdido. Atributos usam pontos conquistados e receitas efetivamente pagas. Equipamentos vêm de drops; peças dispensadas são desmontadas por Coin. Refino usa o RNG privado e os custos reais; +8 ou maior exige proteção conquistada. O evento semanal é simulado com combate e heartbeats reais, consumindo presença exclusiva. Sem antecipar futuras raids.

O checkpoint inclui seed, relógio, snapshot, política, extratos de fontes/consumos, resultados de refino, provas de vitórias, milestones e série diária. Saldo final deve reconciliar exatamente com fontes menos consumos; pergaminhos também. Ausências usam R7 explicitamente, sem multiplicar ciclos ou tirar média de vitórias. Três vitórias reais são necessárias para registrar um andar como seguro para offline; derrotas continuam nos resultados.

Comandos: `npm run simulate:campaign -- --seed=4213 --schedule=best --build=swift --days=120 --out=/tmp/campanha.json`. Para retomar: mesmos argumentos com `--resume`. Rotinas: `best`, `regular`, `casual`; builds: `swift`, `balanced`, `brute`. Checkpoints contêm estado de teste, não contas reais.

A otimização do processamento remove validações/clones repetidos do interior de um snapshot já validado e de propriedade do motor R6, preservando validação nas fronteiras públicas. Hunts usam cache de tabelas puras, retornando cópias para impedir contaminação entre contas. A regra de combate/recompensas não muda com essas otimizações. O total de tempo offline liquidado é retornado separadamente da quota civil, pois a quota é corretamente zerada na virada de dia e não serve como contador histórico.

Resultados finais, hashes e limites serão registrados após a execução. Economia real, monetização e +16–20 permanecem desligados; sucesso de uma simulação não autoriza corte de produção.

## Candidato de calibragem config3

A referência de XP muda de épico+9 para comum+7, ainda sintética **apenas para calcular o teto**, nunca concedida às contas. Na torre normal, os6s de transição entre as três ondas são incluídos no crédito da vitória; caminhar isoladamente, perder, pausar ou transitar entre ciclos não concede XP. O crédito continua limitado ao tempo qualificado e ao quadrado da referência do encontro versus nível. A tabela de96dias qualificados permanece igual. A configuração é versionada como `economy-v2-config-3`: snapshots privados config2 são rejeitados, sem conversão silenciosa. Não migra/reseta nenhuma conta real, que permanece no legado.

A política limita materiais a25% da presença ativa diária e recua após derrota registrada, sem tratar a pausa voluntária da rotina casual como uma nova derrota. Ela não é apresentada como estratégia ótima comprovada. Reexecuções finais e campanhas preliminares serão distinguidas por hash de fonte; preliminares interrompidas não entram na estimativa de conclusão.
