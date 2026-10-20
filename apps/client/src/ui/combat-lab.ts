import { huntEnemyV4,huntVictoryPlanV4,HUNT_THEMES_V4,type HuntV4,ATTRIBUTE_IDS,ENEMY_TEMPLATES,presetBuildV3,heroStatsV3,usedAttributePoints,attributeBudget,commonEnemyV3,startCombatV3,advanceCombatV3,hitChancePpm,type BuildPresetV3 } from '@akai/shared';
export function createCombatLab(root:HTMLElement){
  const dialog=document.createElement('dialog');dialog.id='combat-lab';dialog.setAttribute('aria-label','Laboratório de builds');
  const labels={force:'Força',vitality:'Vitalidade',agility:'Agilidade',physical:'Defesa física',magic:'Defesa mágica',luck:'Sorte',dexterity:'Destreza'};
  dialog.innerHTML=`<div class="panel combat-lab-panel"><header><h2>Laboratório de builds</h2><button type="button" data-lab-close aria-label="Fechar laboratório">×</button></header><p>Simulação da nova progressão. Não altera seu personagem, equipamentos ou recursos.</p><form id="combat-lab-form"><div class="combat-lab-controls"><label>Nível<input name="level" type="number" min="1" max="1000" value="100" required></label><label>Build<select name="build"><option value="balanced">Equilibrada</option><option value="swift">Veloz</option><option value="brute">Força</option><option value="physical">Defesa física</option><option value="magic">Defesa mágica</option><option value="critical">Crítico</option></select></label><label>Equipamento de cenário<select name="gear"><option value="starter">Espada inicial</option><option value="epic9" selected>Conjunto épico +9</option><option value="legendary20">Conjunto lendário +20</option></select></label><label>Atividade<select name="activity"><option value="main">Torre comum</option><option value="coal">Hunt de carvão</option><option value="iron">Hunt de ferro</option><option value="gold">Hunt de ouro</option></select></label><label>Andar<input name="floor" type="number" min="1" max="1000" value="101" required></label><label>Inimigo<select name="enemy">${ENEMY_TEMPLATES.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></label><label>Semente do cenário<input name="seed" type="number" min="1" max="4294967295" value="4213" required></label></div><p>Pontos iguais entre presets; custos e aquisição de equipamento não são simulados aqui.</p><details><summary>Ajustar distribuição de atributos</summary><div class="combat-lab-controls">${ATTRIBUTE_IDS.map(k=>`<label>${labels[k]}<input data-lab-attribute="${k}" type="number" min="0" max="${k==='agility'?800:1000}" value="0"></label>`).join('')}</div><button type="button" id="lab-preset">Restaurar preset</button></details><button type="submit">Simular 60 segundos</button></form><div id="lab-hunt-arena" hidden aria-label="Cenário da hunt"><span></span><strong></strong></div><p id="lab-status" role="status"></p><div id="lab-stats"></div><ol id="lab-hits" role="log" aria-label="Golpes da simulação"></ol></div>`;
  root.append(dialog);
  const form=dialog.querySelector<HTMLFormElement>('form')!,status=dialog.querySelector<HTMLElement>('#lab-status')!;
  const field=(name:string)=>form.elements.namedItem(name) as HTMLInputElement|HTMLSelectElement;
  const readBuild=()=>presetBuildV3(Number(field('level').value),field('build').value as BuildPresetV3,field('gear').value as 'starter'|'epic9'|'legendary20');
  function preset(){try{const s=readBuild();for(const k of ATTRIBUTE_IDS)dialog.querySelector<HTMLInputElement>(`[data-lab-attribute="${k}"]`)!.value=String(s.attributes[k]);status.textContent='';}catch{status.textContent='Confira o nível e a build.';}}
  for(const name of ['level','build','gear'])field(name).addEventListener('change',preset);
  dialog.querySelector('#lab-preset')!.addEventListener('click',preset);
  dialog.querySelector('[data-lab-close]')!.addEventListener('click',()=>dialog.close());
  const open=root.querySelector<HTMLButtonElement>('#combat-lab-open')!;
  const show=()=>{root.querySelector<HTMLDialogElement>('#menu-dialog')!.close();preset();dialog.showModal();};
  open.addEventListener('click',show);
  function theme(){const kind=field('activity').value as 'main'|HuntV4,arena=dialog.querySelector<HTMLElement>('#lab-hunt-arena')!;arena.hidden=kind==='main';field('enemy').disabled=kind!=='main';if(kind!=='main'){arena.style.setProperty('--hunt-tint',HUNT_THEMES_V4[kind].tint);arena.querySelector('strong')!.textContent=HUNT_THEMES_V4[kind].name+' · prévia visual';}}
  field('activity').addEventListener('change',theme);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    try{
      const s=readBuild();for(const k of ATTRIBUTE_IDS)s.attributes[k]=Number(dialog.querySelector<HTMLInputElement>(`[data-lab-attribute="${k}"]`)!.value);
      const hero=heroStatsV3(s),floor=Number(field('floor').value),activity=field('activity').value as 'main'|HuntV4;
      const hunt=activity==='main'?null:huntEnemyV4(activity,floor);
      const enemy=hunt??commonEnemyV3(floor,field('enemy').value as typeof ENEMY_TEMPLATES[number]['id']);
      const {gearAgility:_,...combatHero}=hero;
      const result=advanceCombatV3(startCombatV3(combatHero,[{id:enemy.id,stats:enemy.stats}],{seed:Number(field('seed').value),floor:hunt?.reference??floor,...(hunt?{deadlineMs:hunt.deadlineMs}:{})}),60000).state;
      status.textContent=`${result.status==='victory'?'Vitória':result.status==='defeat'?'Derrota':result.status==='timeout'?'Tempo esgotado':'Em combate'} · ${(result.clockMs/1000).toFixed(1)}s · ${result.sequence} golpes processados.`;
      if(hunt&&activity!=='main'){const plan=huntVictoryPlanV4(activity,floor,result.status);status.textContent+=` Prévia: ${Number(plan.amount)/1000} ${HUNT_THEMES_V4[activity].name.replace('Hunt de ','')} · XP qualificado calculado na integração. Sem Coin/equipamento/Jade.`;}
      const info=dialog.querySelector<HTMLElement>('#lab-stats')!;
      info.textContent=`Pontos ${usedAttributePoints(s)}/${attributeBudget(Number(field('level').value))} · ATQ ${hero.attack} · HP ${hero.maxHp} · DefF ${hero.physicalDefense} · DefM ${hero.magicDefense} · ${(1000/hero.intervalMs).toFixed(2)} ataques/s · Crítico ${(hero.criticalPpm/1000).toFixed(1)}% · Acerto ${(hitChancePpm(combatHero,enemy.stats)/1000).toFixed(1)}% · Inimigo: ${enemy.name}, ${enemy.stats.physicalShareBp===0?'mágico':enemy.stats.physicalShareBp===10000?'físico':'misto'}.`;
      dialog.querySelector('#lab-hits')!.replaceChildren(...result.hits.map(hit=>{const row=document.createElement('li');row.textContent=`${(hit.at/1000).toFixed(2)}s · ${hit.attacker==='hero'?'Guerreiro':enemy.name}: ${hit.hit?`${hit.damage} de dano${hit.critical?' crítico':''}`:'errou'}`;return row;}));
    }catch(error){status.textContent=`Não foi possível simular: ${error instanceof Error?error.message:'Confira os valores.'}`;dialog.querySelector('#lab-hits')!.replaceChildren();dialog.querySelector('#lab-stats')!.textContent='';}
  });
  return {destroy(){open.removeEventListener('click',show);dialog.remove();}};
}
