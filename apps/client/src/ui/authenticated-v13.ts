import {attributeCost} from '@akai/shared';
import type {economyConsumersV9} from '@akai/shared';
import {api,ApiFailure} from '../online-session.js';
import {commandId} from '../browser-crypto.js';
type View={revision:number;rehearsalOnly:true;consumer:ReturnType<typeof economyConsumersV9>};
type Receipt={status:string;code?:string;revision:number;commandId:string};
export function createAuthenticatedV13(root:HTMLElement,online:boolean){
 if(!online)return {destroy(){}};
 const open=document.createElement('button');open.id='authenticated-v13-open';open.type='button';open.hidden=true;open.textContent='Ensaio online v2';root.querySelector('#economy-preview-open')!.after(open);
 const dialog=document.createElement('dialog');dialog.id='authenticated-v13';dialog.setAttribute('aria-label','Ensaio online v2');
 dialog.innerHTML='<div class="panel combat-lab-panel"><header><h2>Ensaio online v2</h2><button type="button" data-v13-close aria-label="Fechar ensaio online">×</button></header><p>Progresso de teste no servidor, separado da conta atual. Acesso liberado pelo operador. Fechar esta janela interrompe a presença após alguns segundos.</p><p data-v13-status role="status"></p><p data-v13-wallet></p><p data-v13-hp></p><div class="combat-lab-controls"><button data-v13-action="boss">Entrar no boss</button><button data-v13-action="protection">Evento de proteção</button><button data-v13-action="leave">Sair do evento</button><button data-v13-action="sync">Concluir processamento</button><button data-v13-refresh>Atualizar</button></div><details><summary>Batalha e melhorias de teste</summary><label>Atividade <select data-v13-activity><option value="main">Torre</option><option value="coal">Carvão</option><option value="iron">Ferro</option><option value="gold">Ouro</option></select></label><label>Andar <input data-v13-floor type="number" min="1" max="1000" value="1"></label><button data-v13-economy="select">Ir ao andar</button><button data-v13-economy="pause">Pausar</button><button data-v13-economy="settle">Atualizar batalha</button><label>Atributo <select data-v13-attribute><option value="force">Força</option><option value="vitality">Vitalidade</option><option value="agility">Agilidade</option><option value="physical">Defesa física</option><option value="magic">Defesa mágica</option><option value="luck">Sorte</option><option value="dexterity">Destreza</option></select></label><p data-v13-price></p><button data-v13-economy="train">Comprar melhoria</button><p data-v13-progress></p></details><h3>Ranking de dano</h3><ol data-v13-ranking></ol><p data-v13-broadcast></p></div>';
 root.append(dialog);let view:View|undefined,busy=false,disposed=false,readGeneration=0;
 const status=dialog.querySelector<HTMLElement>('[data-v13-status]')!;
 const controls=()=>{for(const button of dialog.querySelectorAll<HTMLButtonElement>('[data-v13-action],[data-v13-economy]'))button.disabled=busy||!view;dialog.querySelector<HTMLButtonElement>('[data-v13-refresh]')!.disabled=busy;};
 const money=(n:string)=>{const v=BigInt(n);return String(v/1000n)+(v%1000n?','+String(v%1000n).padStart(3,'0'):'');};
 function render(){if(!view)return;const c=view.consumer,e=c.event;
  dialog.querySelector('[data-v13-wallet]')!.textContent=`Nível ${c.level} · Coin ${money(c.balances.coin)} · Jade ${money(c.balances.jade)} · Proteção ${c.protection}`;
  dialog.querySelector('[data-v13-hp]')!.textContent=e?`Boss: ${e.hp.toLocaleString('pt-BR')} / ${e.maxHp.toLocaleString('pt-BR')} HP · Participação: ${Math.floor(e.qualifiedMs/1000)}s / 600s`:'';
  dialog.querySelector('[data-v13-progress]')!.textContent=`${c.activity} · Andar ${c.floor} · Torre conquistada ${c.highest.main} · ${c.paused?'Pausado':'Em combate'} · ${c.log.at(-1)?.text??''}`;
  const attr=dialog.querySelector<HTMLSelectElement>('[data-v13-attribute]')!.value as keyof typeof c.attributes;
  try{const cost=attributeCost(attr,c.attributes[attr]+1);dialog.querySelector('[data-v13-price]')!.textContent='Custo: '+Object.entries(cost).filter(([,n])=>BigInt(n)>0n).map(([k,n])=>money(n)+' '+({coin:'Coin',coal:'Carvão',iron:'Ferro',gold:'Ouro',jade:'Jade'}[k]??k)).join(' + ');}catch{dialog.querySelector('[data-v13-price]')!.textContent='Atributo no limite.';}
  const list=dialog.querySelector('[data-v13-ranking]')!;list.replaceChildren();for(const p of e?.ranking??[]){const li=document.createElement('li');li.textContent=`${p.name}: ${p.damage} de dano`;list.append(li);}
  dialog.querySelector('[data-v13-broadcast]')!.textContent=e?.broadcasts.at(-1)?.text??'';
 }
 function error(e:unknown){status.textContent=e instanceof ApiFailure?({NOT_FOUND:'Ensaio indisponível neste servidor.',V13_NOT_ENROLLED:'Sua conta ainda não foi incluída no ensaio.',UNAUTHENTICATED:'Sua sessão expirou. Entre novamente.'}[e.code]??e.code):'Não foi possível consultar o ensaio.';}
 async function refresh(){const generation=++readGeneration;try{const next=await api<View>('test-v2/state');if(disposed||generation!==readGeneration)return;view=next;render();}catch(e){if(!disposed&&generation===readGeneration){view=undefined;error(e);}}finally{if(!disposed)controls();}}
 async function command(action:string,kind:'events'|'economy'='events'){if(busy||!view)return;busy=true;controls();try{
  let input:unknown=action==='boss'||action==='protection'?{type:'join',mode:action}:{type:action};
  if(kind==='economy'){if(action==='select')input={type:'select',activity:dialog.querySelector<HTMLSelectElement>('[data-v13-activity]')!.value,floor:Number(dialog.querySelector<HTMLInputElement>('[data-v13-floor]')!.value)};else if(action==='pause')input={type:'pause',paused:true};else if(action==='train')input={type:'train',attribute:dialog.querySelector<HTMLSelectElement>('[data-v13-attribute]')!.value};}
  const receipt=await api<Receipt>('test-v2/'+kind,{commandId:commandId(),expectedRevision:view.revision,action:input});
  if(!disposed)status.textContent=receipt.status==='applied'?'Atualizado.':receipt.status==='settling'?'Processando. Use Concluir processamento para continuar.':({STALE_REVISION:'O estado mudou. Atualize e tente novamente.',EVENT_PRESENCE_EXPIRED:'Sua presença terminou. Entre novamente.',EVENT_LOCKED:'Conclua o andar necessário para participar.'}[receipt.code??'']??receipt.code??'Atualizado.');
 }catch(e){if(!disposed)error(e);}finally{await refresh();busy=false;controls();}}
 const show=()=>{root.querySelector<HTMLDialogElement>('#menu-dialog')!.close();dialog.showModal();status.textContent='Consultando…';void refresh();};
 open.addEventListener('click',show);dialog.querySelector('[data-v13-close]')!.addEventListener('click',()=>dialog.close());dialog.querySelector('[data-v13-refresh]')!.addEventListener('click',()=>void refresh());for(const b of dialog.querySelectorAll<HTMLButtonElement>('[data-v13-action]'))b.addEventListener('click',()=>void command(b.dataset.v13Action!));
 for(const b of dialog.querySelectorAll<HTMLButtonElement>('[data-v13-economy]'))b.addEventListener('click',()=>void command(b.dataset.v13Economy!,'economy'));
 dialog.querySelector('[data-v13-attribute]')!.addEventListener('change',render);
 const timer=setInterval(()=>{if(dialog.open&&!document.hidden&&!busy&&view){if(view.consumer.event?.active)void command('heartbeat');else if(!view.consumer.paused)void command('settle','economy');}},10000);
 void api<{v13HttpTest?:boolean}>('auth/config').then(c=>{if(!disposed)open.hidden=!c.v13HttpTest;}).catch(()=>{});
 controls();return {destroy(){disposed=true;clearInterval(timer);open.removeEventListener('click',show);open.remove();dialog.remove();}};
}
