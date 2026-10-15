# ADR-008 — Progressão RPG local e catálogo limitado de1.000 andares

15/10/2026. Adotado sob delegação do usuário na F4. Config `local-rpg-1`, save schema3. Não ativa serviços, gastos, loja premium ou servidor autoritativo.

## Decisão

Conteúdo em content.ts, regras em rpg.ts/loop.ts, schemas separados em rpg-schema.ts. Todas as compras passam por draft validado na LocalSession. UI não cria atributo, loot ou saldo. Equipamentos têm ID monotônico, definição, raridade, nível, enhancement, atributos rolados e afixos; referências equipadas são validadas ao carregar.

Nove slots, dois anéis distintos, armas de duas mãos/arcos incompatíveis com escudo. Raridade muda atributos e quantidade de afixos. Drops usam RNG xorshift32 persistido de desenvolvimento; recarregar não volta ao estado anterior de sorteio nem reexecuta uma morte persistida. Não é RNG seguro para online. Inventário limitado a120 incluindo equipados; excedente de drop vira ferro, sem fila de recompensas ilimitada. Reciclagem de equipado é rejeitada.

Fabricação comum fornece um caminho sem depender de sorte para a primeira peça. Ferro fundido é material, não sétima moeda premium. Aprimoramento conserva o roll, custa recursos e aplica5% por nível, arredondado para cima. Trocar equipamento/companheiro não cura; HP atual só é limitado ao novo máximo. Vitalidade não ressuscita uma tentativa derrotada.

Musgo é o primeiro companheiro: Slime green do próprio acervo, pixel art lateral não humanoide, apresentado como slime domesticado de galeria. Tem identidade/ícone, animação idle, raridade incomum, adoção/evolução e passivos reais; um ativo. Não inventar pet negociável, baú ou drop sem tabela. Arte original preservada; licença não comprovada.

Tônicos de ataque/produção têm prazo wall-clock persistido, custo e rejeição de empilhamento do mesmo tipo. Prazo continua ausente; cálculo de minas segmenta o intervalo válido. Passivos e tônico combinam por regra explícita, sem aplicar bônus expirado a oito horas inteiras. Remainder de minas usa denominador40.000.000 para preservar frações com basis points e25% de bônus.

Ouro exige carvão50, além de custos; jade exige ferro/ouro/carvão/Coins, sem requisito numérico adicional inventado. Níveis de melhorias/minas até1.000 e companheiro até100. Fórmulas/custos em RPG_SYSTEMS. Moedas reais e Ruby continuam fora da progressão local.

## Escala e balanceamento

Preservar atributos dos inimigos1–20. Depois usar curvas polinomiais ancoradas no20, em vez de extrapolar exponenciais até1.000. Catálogo com1.000 IDs, comuns3×3 e100 bosses. Mesmo bioma/família lateral é reutilizado; não são1.000 mapas ou rigs exclusivos.

XP novo de guerreiro/rei é separado e altera a progressão; por isso os resultados F3 são históricos, não substituídos. Limites numéricos e percurso completo com fixture de atributos finais foram simulados. Essa fixture prova execução das agendas e limites, não que um jogador comum conquiste1.000 andares em determinado prazo. Playtest/curvas por faixa continuam antes de distribuição.

## Save e compatibilidade

Decoder verifica o checksum do payload original1/2 antes de migrar. Perfil/saldos/geração/tela/watermark preservados. Schema2 ativo mantém HP, ondas e cooldowns; remainder antigo×40.000. Sem loot/XP retroativos. Torre20 completa segue ao21 com cura normal. Novo perfil usa schema3. Versão/config futura continua preservada e bloqueada, com backup/CAS/quarentena já existentes.

F5 deverá substituir autoridade local por servidor, autenticação, ledger, transações e RNG confiáveis. Não importar o save local como saldo online. F6–F10 seguem separados.
