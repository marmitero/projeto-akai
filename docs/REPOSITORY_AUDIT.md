# Auditoria de estado do repositório

Inspeção em 15/10/2026, base remota `c577406dc292161e09838ac6e05ca3f8c65f87ce`.

## Evidência encontrada

| Área | Estado observado |
|---|---|
| Raiz | docs/, sprites/, referencia_visual.jpg |
| Aplicação | Sem cliente, servidor, package.json, lockfile ou build do jogo |
| Testes | Sem suíte de gameplay; apenas ferramenta de auditoria de imagens |
| Backend/contas | Nenhuma integração configurada no repositório |
| Arte | 7.568 arquivos; 6.872 PNGs; 1.248.212.340 bytes de origem |
| Duplicatas | 757 grupos por SHA-256 na auditoria anterior |
| Documentação prévia | Master Prompt, três guias de assets, índice técnico, 47 páginas e 23 prévias |
| Instruções locais | Nenhum AGENTS.md versionado encontrado |

A stack TypeScript/Phaser/Vite/Node/PostgreSQL é intenção de arquitetura, não tecnologia já instalada. Não há comando válido de execução do jogo a documentar neste momento.

## Reaproveitamento

Preservar integralmente sprites, referência e guias. O script `docs/tools/audit_assets.py` lê arquivos versionados e gera inventário técnico/prévias com Pillow. Não usar seu JSON como preload integral do cliente. Fontes AI/EPS/PSD/Aseprite/SCML são acervo de autoria; apenas derivados selecionados entram no build.

## Lacunas e riscos

Licenças desconhecidas; pivôs, recortes e animações parcialmente mapeados; estilos incompatíveis entre pixel art e bosses detalhados; nenhum retrato oficial do rei, fonte ou áudio identificado. A auditoria técnica está completa para o snapshot original, mas aprovação artística e licenças permanecem abertas. Não foi realizada auditoria de segredos histórica nem auditoria de segurança de código inexistente; nenhuma conclusão de segurança pode ser inferida.

## Próximo passo condicionado

Após nova autorização: fundação técnica local e prova de integração de um subconjunto artístico. Ver [ROADMAP](ROADMAP.md), [riscos](RISKS.md) e [AI_STATE](../AI_STATE.md). Nesta etapa não iniciar implementação.

## Atualização F1 (histórico acima preservado)

Depois do snapshot inicial foram criados apps/client, apps/server e packages/shared, package.json/lockfile, configurações, testes e CI. O estado inicial sem aplicação não descreve mais o HEAD desta etapa. Há fundação executável, sem combate/economia/banco online. Comandos/evidências em DEVELOPMENT e STAGE_01_REPORT. Assets originais inalterados.

## Atualização F2

Cliente contém agora catálogo curado, derivados e renderer com oito animações, HUD e telas. Há script de regeneração opcional e verificador Node de integridade. O acervo sprites e inventário original não foram reescritos. Logs/relatórios e capturas em STAGE_02_REPORT; servidor de gameplay continua indisponível.

## Estado após F3

Loop local real em packages/shared/src/loop.ts, conectado a LocalSession/UI/Phaser;20 andares, bosses10/20, cliques/upgrades/carvão, tutorial, migração1→2 e offline de minas.31 testes e simulação reproduzível; smokes dev/produção. Servidor permanece diagnóstico, sem banco/auth/economia online. Arte nova apenas derivadoRun, boss reutiliza Skeleton validado; nenhum original removido/alterado. Relatório STAGE_03_REPORT e AI_STATE prevalecem sobre inventário histórico do estágio inicial.

## Estado F4

content/rpg/rpg-schema adicionados ao shared; Mochila/Forja/Musgo e ouro/jade funcionais, schema3 migrando1/2.45 testes e duas simulações, subset90 arquivos/fontes/24 derivados. Catálogo1.000 com atributos limitados, sem1.000 mapas exclusivos. Todo sprites/ original e dados históricos da F3 preservados. Servidor ainda diagnóstico; F5 não iniciada. Ver STAGE_04_REPORT.

## Atualização F5 — 15/10/2026

Atualização F5: auditoria inicial acima é histórica. Agora há cliente local/online, servidor autoritativo, domínio compartilhado, migração PostgreSQL, identidade de convidado e Google opcional, CI e testes. Nenhum banco público/conta de provedor foi provisionado. Evidências atuais em STAGE_05_REPORT e instruções em ONLINE.

## Atualização F6 — 15/10/2026

F6 adiciona domínio social/API/UI, migração002, scheduler, moderaçãoCLI e testes. Há implementação testável de chat/guildas/brasões/PvP/rankings/temporadas/boss/XP/loteria/raid/guerra, com gates públicos separados. Estado canônico em AI_STATE/STAGE_06_REPORT/COMMUNITY_SYSTEMS, sem considerar o blueprint histórico como código ausente.
