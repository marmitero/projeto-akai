import type {DailyBossBroadcast} from '@akai/shared';
import {api} from '../online-session.js';
export function createBossBroadcast(root:HTMLElement,online:boolean) {
  const host=root.querySelector<HTMLElement>('#boss-broadcast')!,text=host.querySelector('span')!;
  let visible=false,disposed=false,busy=false,current='',dismissed='',until=0;
  try{dismissed=sessionStorage.getItem('akai-boss-broadcast-dismissed')??'';}catch{}
  host.querySelector('button')!.addEventListener('click',()=>{
    dismissed=current;host.hidden=true;
    try{sessionStorage.setItem('akai-boss-broadcast-dismissed',current);}catch{}
  });
  async function refresh(){
    if(!online||!visible||disposed||document.hidden||busy)return;
    busy=true;
    try{
      const b=await api<DailyBossBroadcast|null>('community/broadcast');
      if(disposed)return;
      if(b&&b.id!==current){current=b.id;until=Date.now()+90000;text.textContent=b.text;text.title=b.text;}
      host.hidden=!visible||!b||b.id===dismissed||Date.now()>=until;
    }catch{host.hidden=true;}finally{busy=false;}
  }
  const resume=()=>{void refresh();};
  const timer=online?setInterval(resume,15000):undefined;
  document.addEventListener('visibilitychange',resume);
  return {show(value:boolean){visible=value;if(!value)host.hidden=true;else resume();},destroy(){disposed=true;clearInterval(timer);document.removeEventListener('visibilitychange',resume);}};
}
