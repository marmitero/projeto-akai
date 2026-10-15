# AI_STATE — Projeto Akai

15/10/2026. **F3 revalidada; F4 implementada, em validação final. F5 não iniciada.** Base remota desta etapa: `54c615a02357df3a122b8f6da17b43fcc55e66f0`.

## Trabalho autorizado e governança

Usuário pediu validar F3 e prosseguir F4. Resolver escolhas técnicas/reversíveis sem consultas; reservar gastos relevantes, mudanças profundas e atos exclusivos do titular. Encerrar listando feito, completude/faltas, decisões, validações pendentes e próximo passo. Atualizar estado, roadmap e demais documentos; não iniciar F5 nesta entrega.

## Validação da F3

Checkout novo, npm ci e npm run check no commit publicado:31 testes, hashes, typecheck e builds passaram. Smoke do build estático repetido:50 ciclos e fluxos econômicos/save/offline/boss/input, sem erros. CI38746492933 confirmada success. Soak30min anterior conferido, sem apresentá-lo como execução nova. Evidências em docs/STAGE_03_VALIDATION.md e relatórios históricos preservados.

## F4 implementada

Config local-rpg-1, save schema3. Núcleo em content.ts/rpg.ts/rpg-schema.ts/loop.ts e LocalSession; interface em ui/rpg.ts. Mochila real com equipamento, filtro, Forja, tônicos e Musgo. Produção com ouro/jade; loja premium continua claramente indisponível. Batalha/estado permanecem independentes da tela e do renderer.

- 1.000 definições por dados: comuns3×3,100 bosses, mesma família/bioma existente; curvas1–20 preservadas, polinomiais limitadas depois. Não são1.000 cenários exclusivos nem percurso orgânico balanceado.
- 14 categorias,9 slots com dois anéis distintos, armas de duas mãos/arco incompatíveis com escudo. Instâncias únicas,5 raridades, atributos rolados, afixos0–4 e aprimoramento0–20. Inventário120 incluindo equipados; excedente de drop vira ferro; equipado não recicla.
- Drops0,5% comum e10%→19,9% nos bosses10→1000. RNG local persistido xorshift32 de desenvolvimento, não seguro para online. Morto persistido não sorteia novamente.
- Fabricação comum, ferro fundido, aprimoramento e reciclagem com custos reais. Tônicos+20%ATQ/60s e+25%minas/300s, sem empilhar mesmo tipo; prazo continua ausente.
- Musgo, slime verde domesticado: incomum, adoção/evolução até100, um ativo,+2%produção e+5HP máximo por nível. Guardar/ativar não cura. Ícones de equipamento não trocam o rig corporal-base.
- XP de guerreiro10f e rei2f por morte; níveis separados, até1.000. Força/vitalidade/clique/carvão e minas ouro/jade até1.000. Ouro mantém requisito carvão50; jade exige recursos, sem requisito numérico adicional inventado.
- Produção segmentada por buffs, BigInt/remainder com denominador40.000.000 e offline só minas até8h. Não há combate/loot/XP offline. Pausa/retry/treino e prazo de boss da F3 preservados.

## Save e segurança

Migração real1/2→3 após SHA original, mantendo recursos/perfil/tela/geração/watermark. Schema2 ativo mantém HP/ondas/cooldowns; resto×40.000. Torre20 completa vai21 com cura normal. Sem loot/XP retroativos. Backup/quarentena/CAS/futuro bloqueado preservados. Payload limitado500KB, inventário limitado e referências equipadas validadas.

Vitalidade corrigida: só acrescenta HP atual se vivo; não ressuscita uma tentativa derrotada. Trocas de equipamento/pet limitam HP ao máximo novo, sem cura gratuita. Servidor continua diagnóstico/503 para gameplay; local não é conta online. Sem auth, banco, ledger, pagamento, anúncio ou contratação. F5 deve assumir autoridade e RNG no servidor, sem importar saldo local.

## Evidências atuais

45 testes em6 arquivos, typecheck, hashes e builds passaram; smokes dev/produção passaram no código final. Catálogo1.000 validado; fixture de atributos finais atravessou toda a torre sem overflow. Sorteios200.000 por fonte:0,519% comum e9,9375% boss10, com bins de raridade exatos. Simulação1/3/5 cliques/s chega ao20 em575/538/538s com XP novo, sem afirmar ritmo humano. F3 histórica não foi sobrescrita. Soak real30min da F4 em execução; só afirmar conclusão após relatório próprio.

Assets:24 derivados,37 originais diretos,66 originais únicos/90 arquivos/fontes verificados,278.153 bytes de autoria. Dois recortes Slime e15 ícones originais novos no catálogo; originais preservados, licenças não comprovadas.10 animações,35 texturas/38 objetos. Capturas finais e dados no relatório F4.

## Documentos e próximo passo

Ler docs/RPG_SYSTEMS.md, ADR-008, STAGE_04_REPORT e testes antes de alterar. Números locais são experimentais; XP mudou o ritmo do20 e foi versionado. Sem validação obrigatória do usuário agora. Continuam licenças, playtest humano e Android/WebGL antes da distribuição. Avisos conhecidos de chunk Phaser/Zod não bloqueiam build.

Próximo recomendado: F5, online autoritativo com autenticação/persistência/ledger/reconexão e concorrência. Preparar opções concretas antes de pedir contratação/credenciais do titular. Aparência por equipamento, mais biomas/companheiros e habilidades avançadas permanecem expansões; não confundir catálogo1.000 com produção artística exclusiva ou equilíbrio comercial comprovado.
