import { ENEMY_TEMPLATES, ENEMY_ROLES, enemyDefinition } from '@akai/shared';
import { bestiaryAssets } from '../assets/bestiary.js';
export function createBestiaryUI(root: HTMLElement) {
 let initialized=false;
 function render(floor:number) {
  const boss=floor%10===0, common=boss?floor-1:floor;
  root.querySelector<HTMLElement>('[data-bestiary-note]')!.textContent=boss ? `Andar de boss reservado. Exibindo atributos comuns no andar ${common}.` : `Atributos comuns no andar ${common}. Fichas posteriores ao andar continuam disponíveis para consulta.`;
  const list=root.querySelector<HTMLElement>('[data-bestiary-list]')!;
  list.replaceChildren(...ENEMY_TEMPLATES.map(t=> {
   const def=enemyDefinition(common,t.id), card=document.createElement('article');card.className='bestiary-card panel';card.dataset['enemyId']=t.id;
   const portrait=document.createElement('span');portrait.className='bestiary-portrait';portrait.style.backgroundImage=`url("${bestiaryAssets[t.id]}")`;portrait.setAttribute('aria-hidden','true');
   const details=document.createElement('div'),title=document.createElement('h2'),info=document.createElement('p'),stats=document.createElement('p');
   title.textContent=t.name;info.textContent=`${ENEMY_ROLES[t.role].label} · a partir do andar ${t.minFloor} · ${t.family}`;
   const n=(v:number)=>v.toLocaleString('pt-BR');
   stats.textContent=`HP ${n(def.hp)} · ATQ ${n(def.attack)} a cada ${def.interval/1000}s · ${n(def.coin)} Coins · ${n(Math.floor(common*10*def.xpBp/10000))} XP do guerreiro · ${n(Math.floor(common*2*def.xpBp/10000))} XP do rei · Drop 0,5%`;
   details.append(title,info,stats);card.append(portrait,details);return card;
  }));
 }
 return {show(visible:boolean) {
  if(!visible || initialized) return;initialized=true;
  root.innerHTML='<p>Criaturas comuns da torre. Bosses serão catalogados em uma etapa própria.</p><label>Consultar andar <input data-bestiary-floor type="number" min="1" max="1000" value="1" step="1"></label><p data-bestiary-note class="muted"></p><div data-bestiary-list></div>';
  const input=root.querySelector<HTMLInputElement>('input')!;
  input.addEventListener('change',()=> {const f=Math.max(1,Math.min(1000,Math.trunc(Number(input.value)||1)));input.value=String(f);render(f);});render(1);
 }};
}
