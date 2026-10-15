# Asset Manifest — Projeto Akai

Inventário completo dos arquivos versionados em `sprites/`. Gerado por `python docs/tools/audit_assets.py` (Pillow).

Snapshot de origem: `367032aff1b4d41c99f8bdb963acedfc0eea96d1`. **7,568 arquivos**, **1,248,212,340 bytes**, **757 grupos de duplicatas exatas por SHA-256**.

O [índice JSON técnico](art/asset_inventory.json) referencia páginas `art/data/assets_*.json` com todos os registros. Elas contêm IDs estáveis por caminho, SHA-256 completo, Git blob SHA-1, dimensões, modo, transparência, bbox alfa, frames GIF e estado de inspeção. O ID permanece estável enquanto o caminho permanecer igual; o hash muda com os bytes.

## Escopo e limites

Todos os arquivos foram lidos e hashados. PNG/GIF foram decodificados; PSD tem somente cabeçalho/composite lido. AI/EPS/SCML/Aseprite são fontes inventariadas, não aprovadas visualmente. As folhas de contato cobrem todas as imagens de UI, ícones, efeitos, cenários e protagonista, e amostras de inimigos/bosses; não equivalem à aprovação de cada frame. Geometria, pivôs e FPS ainda exigem mapeamento quando não explicitados no guia.

Não foram encontrados documentos de licença no snapshot. **Todos os assets têm licença pendente**, inclusive derivados. Autoria/atribuição desconhecidas não significam dispensa de crédito. O repositório público não concede licença comercial dos packs.

Esta auditoria de sprites não descreve o estágio atual da aplicação; consulte AI_STATE.md e os relatórios de etapa para implementação/testes. `sprites/Equipments/` é o caminho real, não `Equipment/`. `sprites/Hud/` também existe. `Acessories` e `Jumlp-All` são grafias reais que devem ser preservadas.

## Resumo por família

| Família | Arquivos | Bytes | Formatos |
|---|---:|---:|---|
| Acessories | 20 | 14146 | .png: 20 |
| Assets | 16 | 172221 | .png: 16 |
| Backgrounds | 18 | 144139 | .png: 18 |
| Boss | 6184 | 1238617333 | (none): 24, .ai: 12, .eps: 588, .png: 5539, .scml: 21 |
| Character | 22 | 147245 | .aseprite: 9, .gif: 6, .png: 7 |
| Effects | 70 | 1443966 | .gif: 6, .png: 64 |
| Enemies | 762 | 7199731 | .ase: 1, .gif: 1, .png: 732, .psd: 28 |
| Equipments | 240 | 176939 | .png: 240 |
| Hud | 51 | 87488 | .png: 51 |
| Materials | 38 | 49246 | .png: 38 |
| Mine | 4 | 2131 | .png: 4 |
| Misc | 140 | 85472 | .png: 140 |
| Tiles | 3 | 72283 | .png: 3 |

## Duplicatas exatas

Mesmos bytes não significam mesmo papel semântico. Não excluir originais: selecionar um asset canônico no registro de runtime. Lista integral dos grupos no JSON.

## Inventário por arquivo

O inventário integral está paginado abaixo para continuar legível no GitHub. Nenhum arquivo é omitido. Dimensões em pixels; hash completo e detalhes de transparência/GIF no JSON. Nomes numéricos não provam material, raridade ou tier.

- [Acessories: 1–20](art/inventory/Acessories_01.md)
- [Assets: 1–16](art/inventory/Assets_01.md)
- [Backgrounds: 1–18](art/inventory/Backgrounds_01.md)
- [Boss: 1–200](art/inventory/Boss_01.md)
- [Boss: 201–400](art/inventory/Boss_02.md)
- [Boss: 401–600](art/inventory/Boss_03.md)
- [Boss: 601–800](art/inventory/Boss_04.md)
- [Boss: 801–1000](art/inventory/Boss_05.md)
- [Boss: 1001–1200](art/inventory/Boss_06.md)
- [Boss: 1201–1400](art/inventory/Boss_07.md)
- [Boss: 1401–1600](art/inventory/Boss_08.md)
- [Boss: 1601–1800](art/inventory/Boss_09.md)
- [Boss: 1801–2000](art/inventory/Boss_10.md)
- [Boss: 2001–2200](art/inventory/Boss_11.md)
- [Boss: 2201–2400](art/inventory/Boss_12.md)
- [Boss: 2401–2600](art/inventory/Boss_13.md)
- [Boss: 2601–2800](art/inventory/Boss_14.md)
- [Boss: 2801–3000](art/inventory/Boss_15.md)
- [Boss: 3001–3200](art/inventory/Boss_16.md)
- [Boss: 3201–3400](art/inventory/Boss_17.md)
- [Boss: 3401–3600](art/inventory/Boss_18.md)
- [Boss: 3601–3800](art/inventory/Boss_19.md)
- [Boss: 3801–4000](art/inventory/Boss_20.md)
- [Boss: 4001–4200](art/inventory/Boss_21.md)
- [Boss: 4201–4400](art/inventory/Boss_22.md)
- [Boss: 4401–4600](art/inventory/Boss_23.md)
- [Boss: 4601–4800](art/inventory/Boss_24.md)
- [Boss: 4801–5000](art/inventory/Boss_25.md)
- [Boss: 5001–5200](art/inventory/Boss_26.md)
- [Boss: 5201–5400](art/inventory/Boss_27.md)
- [Boss: 5401–5600](art/inventory/Boss_28.md)
- [Boss: 5601–5800](art/inventory/Boss_29.md)
- [Boss: 5801–6000](art/inventory/Boss_30.md)
- [Boss: 6001–6184](art/inventory/Boss_31.md)
- [Character: 1–22](art/inventory/Character_01.md)
- [Effects: 1–70](art/inventory/Effects_01.md)
- [Enemies: 1–200](art/inventory/Enemies_01.md)
- [Enemies: 201–400](art/inventory/Enemies_02.md)
- [Enemies: 401–600](art/inventory/Enemies_03.md)
- [Enemies: 601–762](art/inventory/Enemies_04.md)
- [Equipments: 1–200](art/inventory/Equipments_01.md)
- [Equipments: 201–240](art/inventory/Equipments_02.md)
- [Hud: 1–51](art/inventory/Hud_01.md)
- [Materials: 1–38](art/inventory/Materials_01.md)
- [Mine: 1–4](art/inventory/Mine_01.md)
- [Misc: 1–140](art/inventory/Misc_01.md)
- [Tiles: 1–3](art/inventory/Tiles_01.md)

## Runtime F3

Registro curado atualizado:22 derivados/22 originais diretos,50 originais únicos ao incluir fontes e72 arquivos/fontes verificados. Run acrescentado sem modificar o acervo. Boss reutiliza Skeleton validado. O inventário integral deste documento não é lista de preload. Ver [registro runtime](art/Runtime_Asset_Manifest.json) e [relatório F3](STAGE_03_REPORT.md).
