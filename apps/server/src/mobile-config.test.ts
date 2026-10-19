import { describe,expect,it } from 'vitest';
import { parseServerConfig } from './config.js';
const lan={LAN_PREVIEW:'true',PUBLIC_ORIGIN:'http://192.168.1.20:5173'};
describe('explicit private LAN playtest configuration',()=>{
 it('keeps default API loopback and rejects plain HTTP LAN without opt-in',()=>{
  expect(parseServerConfig({}).LAN_PREVIEW).toBe(false);
  expect(()=>parseServerConfig({PUBLIC_ORIGIN:lan.PUBLIC_ORIGIN})).toThrow('INSECURE_PUBLIC_ORIGIN');
  expect(parseServerConfig(lan)).toMatchObject({HOST:'127.0.0.1',LAN_PREVIEW:true,COOKIE_SECURE:false,MONETIZATION_MODE:'off'});
 });
 it('accepts only canonical RFC1918 origins for development',()=>{
  for(const ip of ['10.0.0.3','172.16.1.2','172.31.255.254','192.168.12.5'])expect(parseServerConfig({...lan,PUBLIC_ORIGIN:`http://${ip}:5173`}).LAN_PREVIEW).toBe(true);
  for(const url of ['http://8.8.8.8:5173','http://172.32.1.2:5173','http://localhost:5173','http://100.64.1.2:5173','http://192.168.1.20:5173/path','http://u:p@192.168.1.20:5173','https://192.168.1.20:5173'])expect(()=>parseServerConfig({...lan,PUBLIC_ORIGIN:url})).toThrow();
 });
 it('does not relax production, API binding, Google or monetization',()=>{
  for(const patch of [{NODE_ENV:'production'},{HOST:'0.0.0.0'},{HOST:'192.168.1.20'},{COOKIE_SECURE:'true'},{MONETIZATION_MODE:'sandbox'},{GOOGLE_CLIENT_ID:'id'}])expect(()=>parseServerConfig({...lan,...patch})).toThrow();
  expect(()=>parseServerConfig({PUBLIC_ORIGIN:'https://example.com'})).toThrow('HTTPS_REQUIRES_SECURE_COOKIE');
 });
});
