import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isPrivateIpv4,lanAddresses,chooseLanAddress,mobileRequestAllowed} from '../mobile-network.mjs';
const iface=(address,internal=false)=>({address,family:'IPv4',internal});
test('prefers Wi-Fi and excludes loopback/virtual/public addresses',()=>{
 const networks={'Wi-Fi':[iface('192.168.1.20')],Ethernet:[iface('10.0.0.2')],vEthernet:[iface('172.20.0.1')],lo:[iface('127.0.0.1',true)],public:[iface('8.8.8.8')]};
 assert.equal(chooseLanAddress(undefined,networks),'192.168.1.20');assert.equal(lanAddresses(networks).length,2);
 assert.equal(chooseLanAddress('10.0.0.2',networks),'10.0.0.2');
 assert.throws(()=>chooseLanAddress('192.168.1.99',networks));assert.throws(()=>chooseLanAddress('0.0.0.0',networks));
});
test('fails clearly for no network or ambiguous adapters',()=>{
 assert.throws(()=>chooseLanAddress(undefined,{}),/Nenhum IPv4/);
 assert.throws(()=>chooseLanAddress(undefined,{Ethernet:[iface('10.0.0.2')],Ethernet2:[iface('192.168.1.2')]}),/Mais de uma rede/);
});
test('only RFC1918 and exact Host/Origin may reach the mobile preview',()=>{
 const origin='http://192.168.1.20:5173',req={socket:{remoteAddress:'192.168.1.30'},headers:{host:'192.168.1.20:5173',origin}};
 assert.ok(mobileRequestAllowed(req,origin));
 for(const ip of ['127.0.0.1','8.8.8.8','100.64.1.1','172.32.0.1','192.168.0.999'])assert.equal(isPrivateIpv4(ip),false);
 assert.equal(mobileRequestAllowed({...req,headers:{...req.headers,origin:'http://evil.test'}},origin),false);
 assert.equal(mobileRequestAllowed({...req,headers:{host:'evil.test'}},origin),false);
 assert.equal(mobileRequestAllowed({...req,socket:{remoteAddress:'8.8.8.8'}},origin),false);
});
test('local PC may reach the selected LAN Host; unrelated Host still rejected',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{host:'192.168.1.20:5173'}};
 assert.ok(mobileRequestAllowed(req,'http://192.168.1.20:5173'));
 assert.equal(mobileRequestAllowed({...req,headers:{host:'localhost:5173'}},'http://192.168.1.20:5173'),false);
});
