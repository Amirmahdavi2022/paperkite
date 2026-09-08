'use strict';
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { AbiCoder, id } = require('ethers');
const engine = require('../src/engine.js');

const SRC = fs.readFileSync(path.join(__dirname, '../contracts/Paperkite.sol'), 'utf8');

function compile() {
  const input = {
    language: 'Solidity',
    sources: { 'Paperkite.sol': { content: SRC } },
    settings: {
      optimizer: { enabled: true, runs: 1 },
      viaIR: true,
      evmVersion: 'paris',
      outputSelection: { '*': { '*': ['evm.bytecode.object', 'evm.deployedBytecode.object'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errs = (out.errors || []).filter(e => e.severity === 'error');
  if (errs.length) { errs.forEach(e => console.error(e.formattedMessage)); process.exit(1); }
  const c = out.contracts['Paperkite.sol']['Paperkite'];
  return c.evm.bytecode.object;
}

async function main() {
  const bytecode = compile();
  console.log('compiled, creation size', bytecode.length / 2, 'bytes');

  const evmMod = require('@ethereumjs/evm');
  const evm = evmMod.createEVM ? await evmMod.createEVM() : await evmMod.EVM.create();

  const deployed = await evm.runCode({
    code: Buffer.from(bytecode, 'hex'),
    gasLimit: BigInt(1e10)
  });
  if (deployed.exceptionError) throw new Error('deploy: ' + deployed.exceptionError.error);
  const runtime = deployed.returnValue;
  console.log('runtime size', runtime.length, 'bytes (EIP-170 limit 24576)');

  const abi = AbiCoder.defaultAbiCoder();
  const selRender = id('render(uint256)').slice(0, 10);
  const selTraits = id('traits(uint256)').slice(0, 10);

  async function call(sel, seed) {
    const data = Buffer.from((sel + abi.encode(['uint256'], [seed]).slice(2)).slice(2), 'hex');
    const res = await evm.runCode({ code: runtime, data, gasLimit: BigInt(1e10) });
    if (res.exceptionError) throw new Error('call: ' + res.exceptionError.error);
    return abi.decode(['string'], '0x' + Buffer.from(res.returnValue).toString('hex'))[0];
  }

  const seeds = [];
  for (let k = 1; k <= 400; k++) seeds.push(k);
  for (let k = 0; k < 60; k++) seeds.push(1 + k * 7919);
  seeds.push(0, 1, 2, 4294967295, 123456789, 2 ** 31, 2 ** 32 - 7);

  let pass = 0, fail = 0, gasTotal = 0n;
  for (const seed of seeds) {
    const js = engine.render(seed);
    const onchain = await call(selRender, seed);
    const jsTraits = js.traits;
    const onchainTraits = await call(selTraits, seed);

    if (onchain === js.svg && onchainTraits === jsTraits) {
      pass++;
    } else {
      fail++;
      if (fail <= 2) {
        console.log('\nMISMATCH seed', seed);
        console.log('traits js      :', jsTraits);
        console.log('traits onchain :', onchainTraits);
        for (let k = 0; k < Math.max(js.svg.length, onchain.length); k++) {
          if (js.svg[k] !== onchain[k]) {
            console.log('first diff at char', k);
            console.log('  js     :', JSON.stringify(js.svg.slice(Math.max(0, k - 60), k + 60)));
            console.log('  onchain:', JSON.stringify(onchain.slice(Math.max(0, k - 60), k + 60)));
            break;
          }
        }
      }
    }
  }

  const sample = await evm.runCode({
    code: runtime,
    data: Buffer.from((selRender + abi.encode(['uint256'], [7]).slice(2)).slice(2), 'hex'),
    gasLimit: BigInt(1e10)
  });
  gasTotal = sample.executionGasUsed;

  console.log('\nseeds tested:', seeds.length, ' identical:', pass, ' mismatched:', fail);
  console.log('gas for one render (view call, free to the reader):', gasTotal.toString());
  console.log('svg size example:', engine.render(7).svg.length, 'bytes');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
