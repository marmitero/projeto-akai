import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const preview=process.argv.includes('--preview'), origin='http://127.0.0.1:5197';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(preview?['preview']:[]),'apps/client','--host','127.0.0.1','--port','5197','--strictPort'],{stdio:'ignore',env:{...process.env,VITE_GAME_MODE:'local'}});
let browser;
try {
  for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage(), errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('#game[data-load-status=ready]').waitFor();
  if(await page.locator('#nickname-setup').isVisible()) {
    await page.locator('#starting-name').fill('Teste Layout');
    await page.locator('#nickname-setup button').click();
  }
  await page.locator('#pause-battle').click();
  for(const [width,height] of [[320,640],[360,740],[390,844],[412,915],[1280,800],[844,390],[390,430]]) {
    await page.setViewportSize({width,height});
    for(const channel of ['global','system']) {
      await page.locator(`#battle-tab-${channel}`).click();
      // Layout fixture only: real online send/receive remains in smoke-community.
      await page.evaluate(channel=>{
        const list=document.querySelector(channel==='global'?'#battle-global-log':'#battle-system-log');
        list.hidden=false;list.replaceChildren(...Array.from({length:50},(_,i)=>{const li=document.createElement('li');li.textContent=`Jogador ${i}: ${'Mensagem longa de teste '.repeat(22)}`;return li;}));
        if(channel==='global'){
          document.querySelector('#battle-global-form').hidden=false;
          document.querySelector('#battle-global-status').textContent='Global · atualização automática';
          document.querySelector('#battle-global-latest').hidden=false;
        }else document.querySelector('#battle-log-empty').hidden=true;
      },channel);
      const box=await page.evaluate(channel=>{
        const content=document.querySelector('#content'),hud=document.querySelector('.bottom-hud');
        const list=document.querySelector(channel==='global'?'#battle-global-log':'#battle-system-log');
        const field=channel==='global'?document.querySelector('#battle-global-input'):list;
        const send=channel==='global'?document.querySelector('#battle-global-form button'):list;
        const a=field.getBoundingClientRect(),b=send.getBoundingClientRect(),c=content.getBoundingClientRect();
        const arena=document.querySelector('.stage-frame').getBoundingClientRect();
        list.scrollTop=100;
        return {mainScroll:content.scrollHeight-content.clientHeight,mainTop:content.scrollTop,
          fieldTop:a.top,fieldBottom:a.bottom,sendBottom:b.bottom,contentBottom:c.bottom,hudTop:hud.getBoundingClientRect().top,
          logHeight:list.clientHeight,logScroll:list.scrollTop,arenaHeight:arena.height,horizontal:document.documentElement.scrollWidth-innerWidth};
      },channel);
      assert.ok(box.mainScroll<=1,JSON.stringify({width,height,channel,...box}));
      assert.equal(box.mainTop,0);assert.ok(box.fieldTop>=0);assert.ok(box.fieldBottom<=box.contentBottom+1);assert.ok(box.sendBottom<=box.hudTop+1);
      assert.ok(box.logHeight>0,JSON.stringify({width,height,channel,...box}));assert.ok(box.logScroll>0);assert.ok(box.arenaHeight>0);assert.ok(box.horizontal<=1);
      results.push({width,height,channel,...box});
      if(process.env.AKAI_CHAT_SCREENSHOT && width===390 && height===844 && channel==='global') await page.screenshot({path:process.env.AKAI_CHAT_SCREENSHOT});
    }
  }
  assert.deepEqual(errors,[]);
  await writeFile(`docs/chat-layout-${preview?'preview':'dev'}.json`,JSON.stringify({fixture:'Local UI with 50 long messages; no claim of online transport or physical keyboard testing',results,pageErrors:errors},null,2)+'\n');
  console.log(`Chat layout passed (${preview?'preview':'dev'}): ${results.length} viewport/channel cases`);
}finally{await browser?.close();server.kill();}
