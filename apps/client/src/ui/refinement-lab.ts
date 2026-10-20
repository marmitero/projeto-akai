import {RARITIES,RARITY,initialEconomyV2,ECONOMY_XP_V2,EconomyItemV2Schema,refinementQuoteV5,refineItemV5,equipmentStats,type EconomyV2} from '@akai/shared';
export function createRefinementLab(root:HTMLElement){
 const dialog=document.createElement('dialog');dialog.id='refinement-lab';dialog.setAttribute('aria-label','Laboratório de refino');
 dialog.innerHTML=`<div class="panel combat-lab-panel"><header><h2>Laboratório de refino</h2><button type="button" data-refine-close aria-label="Fechar laboratório de refino">×</button></header><p>Item e recursos de cenário. Esta simulação não altera sua conta.</p><form id="refine-lab-form"><div class="combat-lab-controls"><label>Raridade<select name="rarity">${RARITIES.map(r=>`<option value="${r}" ${r==='legendary'?'selected':''}>${RARITY[r].label}</option>`).join('')}</select></label><label>Nível do item<input name="level" type="number" min="1" max="100" value="50" required></label><label>Refino atual<input name="enhancement" type="number" min="0" max="20" value="7" required></label><label>Semente do cenário<input name="seed" type="number" min="1" max="4294967295" value="4213" required></label></div><label class="refine-protection"><input name="protect" type="checkbox"> Usar 1 pergaminho de proteção</label><div id="refine-quote" aria-live="polite"></div><p id="refine-warning"></p><button type="submit">Simular tentativa</button><button type="button" id="refine-reset">Recriar cenário</button></form><p id="refine-status" role="status"></p><p id="refine-wallet"></p><ol id="refine-history" role="log" aria-label="Histórico de refino"></ol></div>`;
 root.append(dialog);
 const form=dialog.querySelector<HTMLFormElement>('form')!,field=(n:string)=>form.elements.namedItem(n) as HTMLInputElement|HTMLSelectElement;
 const status=dialog.querySelector<HTMLElement>('#refine-status')!,quoteEl=dialog.querySelector<HTMLElement>('#refine-quote')!,warning=dialog.querySelector<HTMLElement>('#refine-warning')!,submit=form.querySelector<HTMLButtonElement>('[type=submit]')!;
 let state:EconomyV2,seed=4213;
 const fmt=(x:string)=>new Intl.NumberFormat('pt-BR').format(BigInt(x)/1000n);
 const resourceNames={coin:'Coin',coal:'Carvão',iron:'Ferro',gold:'Ouro',jade:'Jade'};
 function render(){
  dialog.querySelector('#refine-wallet')!.textContent=state?`Recursos de cenário: ${fmt(state.balances.coin)} Coin · ${fmt(state.balances.coal)} carvão · ${fmt(state.balances.iron)} ferro · ${fmt(state.balances.gold)} ouro · ${state.protection} pergaminhos.`:'';
  try{
   const item=state.inventory[0];if(!item){submit.disabled=true;quoteEl.textContent='Item quebrado. Recrie o cenário para testar novamente.';warning.textContent='';return;}
   const protectedInput=field('protect') as HTMLInputElement;protectedInput.disabled=item.enhancement<7||item.enhancement===20;if(protectedInput.disabled)protectedInput.checked=false;
   if(item.enhancement===20){quoteEl.textContent='Fortalecimento máximo +20.';warning.textContent='';submit.disabled=true;return;}
   const q=refinementQuoteV5(item,protectedInput.checked),current=equipmentStats(item),next=equipmentStats({...item,enhancement:q.target});
   quoteEl.textContent=`Próximo: +${q.target} · Sucesso ${(q.successPpm/10000).toLocaleString('pt-BR')}% · Quebra por tentativa ${(q.breakPpm/10000).toLocaleString('pt-BR')}%. Custos: ${Object.entries(q.cost).filter(([,v])=>v!=='0').map(([k,v])=>`${fmt(v)} ${resourceNames[k as keyof typeof resourceNames]}`).join(' + ')}${q.protectionCost?' + 1 pergaminho':''}. ATQ ${current.attack} → ${next.attack}. HP ${current.hp} → ${next.hp}.`;
   const failure={maintain:'Falha mantém o nível.',regress:'Falha reduz 1 nível.',mixed:`Na falha: ${(q.conditionalBreakPpm/10000).toLocaleString('pt-BR')}% de quebra; caso contrário, reduz 1 nível.`,destroy:'Toda falha quebra o item.'}[q.failure];
   warning.textContent=`${failure} Recursos são gastos inclusive na falha.${q.protectionCost?' O pergaminho também é consumido no sucesso e não aumenta a chance.':''}${!q.available?' +16 a +20 aguardam o lançamento do boss diário de Jade.':''}`;
   submit.disabled=!q.available;
  }catch(e){quoteEl.textContent='';warning.textContent=`Confira o cenário: ${e instanceof Error?e.message:'valores inválidos'}`;submit.disabled=true;}

 }
 function reset(){try{
  state=initialEconomyV2('00000000-0000-4000-8000-000000000001',0);state.masteryMs=ECONOMY_XP_V2[999]!;
  state.inventory[0]=EconomyItemV2Schema.parse({...state.inventory[0],rarity:field('rarity').value,level:Number(field('level').value),enhancement:Number(field('enhancement').value)});
  for(const k of Object.keys(state.balances) as (keyof EconomyV2['balances'])[])state.balances[k]=k==='jade'?'0':'1000000000000000';state.protection=1000;
  seed=Number(field('seed').value);status.textContent='Cenário recriado. Nenhum recurso real foi gasto.';dialog.querySelector('#refine-history')!.replaceChildren();render();
 }catch(e){status.textContent=`Confira os valores: ${e instanceof Error?e.message:'inválidos'}`;submit.disabled=true;}}
 for(const n of ['rarity','level','enhancement','seed'])field(n).addEventListener('change',reset);
 field('protect').addEventListener('change',render);dialog.querySelector('#refine-reset')!.addEventListener('click',reset);
 form.addEventListener('submit',event=>{event.preventDefault();if(submit.disabled)return;try{
  const item=state.inventory[0]!;const r=refineItemV5(state,{itemId:item.id,expectedRevision:state.revision,protect:(field('protect') as HTMLInputElement).checked},seed);state=r.state;seed=r.seed;
  const labels={success:'Sucesso',maintained:'Falhou: nível mantido',regressed:'Falhou: perdeu 1 nível',destroyed:'Falhou: item quebrado'};
  status.textContent=`${labels[r.receipt.outcome]} · +${r.receipt.from}${r.receipt.enhancement===null?'':` → +${r.receipt.enhancement}`}.`;
  const row=document.createElement('li');row.textContent=status.textContent;const log=dialog.querySelector('#refine-history')!;log.prepend(row);while(log.children.length>30)log.lastElementChild!.remove();
  if(state.inventory[0])field('enhancement').value=String(state.inventory[0].enhancement);render();
 }catch(e){status.textContent=`Tentativa recusada: ${e instanceof Error?e.message:'erro'}`;}});
 const opener=root.querySelector('#refinement-lab-open')!,show=()=>{root.querySelector<HTMLDialogElement>('#menu-dialog')!.close();reset();dialog.showModal();};
 opener.addEventListener('click',show);dialog.querySelector('[data-refine-close]')!.addEventListener('click',()=>dialog.close());
 return {destroy(){opener.removeEventListener('click',show);dialog.remove();}};
}
