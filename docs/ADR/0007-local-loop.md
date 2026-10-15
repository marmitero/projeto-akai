# ADR-007 — Loop local, retomada e recuperação de progressão

15/10/2026. Estado: adotado na F3 sob delegação do usuário. Configuração experimental `local-loop-1`; não é economia online nem balanceamento comercial.

## Domínio e tempo

Motor puro em `packages/shared/src/loop.ts`; `LocalSession` possui relógio/estado, independentemente da tela Phaser. UI envia comandos; animação não concede recursos. Agenda em milissegundos inteiros: deadline do boss vence empate, depois herói, depois inimigos vivos por índice. Alvo é o primeiro vivo. Coin é creditado quando HP muda de positivo para zero, no mesmo draft; cadáver não ataca nem concede novamente. Sem ledger online fictício.

Cada encontro recebe contador monotônico `attempt`; índice do inimigo é estável nesse encontro. Três ondas de três nos comuns; uma onda/um Guardião Ossudo nos bosses10/20. Transição de 3s entre encontros; cura completa entre andares e ao iniciar tentativa/treino, não entre ondas. Vitalidade acrescenta15 ao HP atual e máximo; força só altera ataques seguintes. Crítico/defesa/buffs não têm upgrades ativos nesta fatia. O encerramento do andar 20 mantém a torre concluída, sem criar andar 21.

Pausa manual suspende ataques/transições, mantendo mineração e produção. Nos bosses o prazo continua correndo inclusive pausado. Ausência suspende ataques/transições, mas reduz o prazo restante de boss e, se expirado, falha sem grants. Tick visível100ms; atraso maior que5s é tratado como ausência, evitando combate acelerado após suspensão do navegador. Relógio regressivo não reduz watermark nem concede tempo duas vezes.

## Economia e save

Saldos são strings de inteiros de milésimos; cálculos por BigInt, limite38 dígitos. Compras quantity1 com custo exibido, validação conjunta de ferro/Coin e benefício no mesmo draft; níveis limitados experimentalmente a100. Carvão produz100×nível milésimos/s; acumulador racional denominador1000 preserva sobras em 0..999. Não há clique de carvão, receitas, Ruby, ouro ou jade ativos.

Schema2 acrescenta combate/upgrades/tutorial/watermark/remainder. Decoder primeiro confere SHA do payload original; migração pura da versão real1 preserva perfil, saldos, tela, geração e activeMs e inicia a torre no1, sem inventar progresso anterior. Primeira gravação guarda o save antigo como backup. Versões/configs futuras continuam preservadas e bloqueadas. Checksum protege corrupção acidental, não adulteração intencional.

Reconciliação credita só minas por até 8h e atualiza watermark no mesmo snapshot. Resumo informa crédito já aplicado e não tem botão de coletar. Save automático15s, imediato no boot/retomada/compras/ações de batalha, mais tentativa ao ocultar/sair; unload não é garantia. Crash pode perder ações desde o último checkpoint, não duplica uma recompensa já persistida. Geração/CAS permite só um escritor; conflito exige recarregar. Repetir toque deliberado é novo comando local, não replay de request online.

## Treino manual após boss

Simulação revelou softlock no20: sem Coin para vitalidade, minerar mais ferro não destrava; retry do mesmo boss pode render zero. Acrescentado **Treinar no andar anterior**, somente após pausa de boss. Repete uma execução3×3 do andar 9/19, concede moedas normais por mortes e volta a pausar, inclusive após vitória. Não inicia boss sozinho nem cria farm automático. Retry e treino são ações explícitas; falha comum ainda repete o próprio andar. O jogador pode repetir treinos conforme necessário. A implementação online futura precisa de limites/observabilidade próprios.

Isso detalha a política proposta de pausa sem alterar boss a cada dez, retorno ao anterior ou proibição de tentativas infinitas automáticas. Não há cobrança ou perda de inventário.

## Arte e limites

Boss usa a família Skeleton validada, ampliada2,8×, com identificação Guardião Ossudo e os mesmos estados idle/ataque/morte; os dois bosses reutilizam arte com atributos distintos. Evita misturar os rigs vetoriais do diretório Boss ao pixel art. Herói ganha Run derivado rastreável para a transição; originais preservados. Efeitos são coalescidos em pool; crédito por clique não depende de haver partícula livre. Modo reduzir movimento e modais afetam apresentação/input, não economia.

F4 detalha equipamentos, pets, ouro/jade, receitas, XP e curvas para1.000 andares. F5 é necessária para autoridade de servidor/ledger/idempotência de rede. Nenhuma conta, serviço pago ou monetização ativada.
