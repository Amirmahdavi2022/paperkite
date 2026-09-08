'use strict';
const fs=require('fs'),path=require('path'),solc=require('solc');
const {AbiCoder,id}=require('ethers');
const engine=require('../src/engine.js');
const SRC=fs.readFileSync(path.join(__dirname,'../contracts/Paperkite.sol'),'utf8');
const input={language:'Solidity',sources:{'P.sol':{content:SRC}},settings:{optimizer:{enabled:true,runs:1},viaIR:true,evmVersion:'paris',outputSelection:{'*':{'*':['evm.bytecode.object']}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input)));
const bc=out.contracts['P.sol']['Paperkite'].evm.bytecode.object;
(async()=>{
  const m=require('@ethereumjs/evm');
  const evm=m.createEVM?await m.createEVM():await m.EVM.create();
  const d=await evm.runCode({code:Buffer.from(bc,'hex'),gasLimit:BigInt(1e10)});
  const rt=d.returnValue, abi=AbiCoder.defaultAbiCoder(), sel=id('render(uint256)').slice(0,10);
  const call=async s=>{const data=Buffer.from((sel+abi.encode(['uint256'],[s]).slice(2)).slice(2),'hex');
    const r=await evm.runCode({code:rt,data,gasLimit:BigInt(1e10)});
    return abi.decode(['string'],'0x'+Buffer.from(r.returnValue).toString('hex'))[0];};
  let fail=0,maxGas=0n,sizes=[];
  const svgs=[];
  for(let s=1;s<=60;s++){
    const a=engine.render(s).svg, b=await call(s);
    if(a!==b){fail++; if(fail<3)console.log('mismatch at',s);}
    sizes.push(b.length);
    if(s<=12)svgs.push({s,svg:b,t:engine.render(s).traits});
  }
  sizes.sort((x,y)=>x-y);
  console.log('scenes rendered:',sizes.length,' mismatched:',fail);
  console.log('svg bytes  min',sizes[0],' median',sizes[Math.floor(sizes.length/2)],' max',sizes[sizes.length-1]);
  const cards=svgs.map(o=>`<figure>${o.svg}<figcaption><span>#${o.s}</span><span>${o.t}</span></figcaption></figure>`).join('');
  fs.writeFileSync('docs/index.html',
`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>paperkite — drawn by the contract</title>
<style>body{margin:0;background:#b8b6ae;color:#23221f;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:28px 16px 64px}
header{max-width:900px;margin:0 auto 26px}h1{font:300 44px/1 Georgia,serif;margin:0 0 8px;letter-spacing:-.02em}
header p{margin:0;max-width:52ch;color:#4a4842}
.g{max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
@media(min-width:720px){.g{grid-template-columns:repeat(3,1fr);gap:20px}}
figure{margin:0;background:#f7f5f0;padding:10px 10px 8px;box-shadow:0 1px 2px rgba(0,0,0,.16),0 8px 22px rgba(0,0,0,.14)}
figure svg{display:block;width:100%;height:auto}
figcaption{display:flex;justify-content:space-between;gap:8px;padding-top:8px;font-size:11.5px;color:#6d6a63}</style>
<header><h1>paperkite</h1><p>Every scene below came out of the smart contract itself, run in a real EVM. Not one pixel was drawn by a server.</p></header>
<div class="g">${cards}</div>`);
  console.log('gallery written');
})();
