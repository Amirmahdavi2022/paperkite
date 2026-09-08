'use strict';
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { VM } = require('@ethereumjs/vm');
const { Address, Account, hexToBytes, privateToAddress } = require('@ethereumjs/util');
const { LegacyTransaction } = require('@ethereumjs/tx');
const { AbiCoder, id, keccak256, toUtf8Bytes } = require('ethers');
const engine = require('../src/engine.js');

const abi = AbiCoder.defaultAbiCoder();

function compileAll() {
  const names = ['Base64.sol', 'ERC721Min.sol', 'Paperkite.sol', 'PaperkiteNFT.sol'];
  const sources = {};
  for (const n of names) sources[n] = { content: fs.readFileSync(path.join(__dirname, '../contracts', n), 'utf8') };
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 1 },
      viaIR: true,
      evmVersion: 'paris',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errs = (out.errors || []).filter(e => e.severity === 'error');
  if (errs.length) { errs.forEach(e => console.error(e.formattedMessage)); process.exit(1); }
  return out.contracts;
}

// deterministic local-only test keys — never used anywhere real
const KEY_DEPLOYER = hexToBytes('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690');
const KEY_PAYOUT    = hexToBytes('0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffd');
const KEY_BUYER_A   = hexToBytes('0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656');
const KEY_BUYER_B   = hexToBytes('0xea41e5f8bb7f42e37d9c8ba58b95fabe38fc8ba8e0ded64896cb4dc7bd1e02b8'.length === 66 ? '0xea41e5f8bb7f42e37d9c8ba58b95fabe38fc8ba8e0ded64896cb4dc7bd1e02b8' : '0x0000000000000000000000000000000000000000000000000000000000000b');

const deployer = new Address(privateToAddress(KEY_DEPLOYER));
const payoutAcc = new Address(privateToAddress(KEY_PAYOUT));
const buyerA = new Address(privateToAddress(KEY_BUYER_A));

let nonces = {};
async function fund(vm, addr) {
  const acc = await vm.stateManager.getAccount(addr) || new Account();
  acc.balance = 10n ** 22n;
  await vm.stateManager.putAccount(addr, acc);
  nonces[addr.toString()] = 0n;
}

async function send(vm, key, opts) {
  const from = new Address(privateToAddress(key));
  const nonce = nonces[from.toString()];
  const tx = LegacyTransaction.fromTxData({
    nonce,
    gasLimit: 6_000_000n,
    gasPrice: 100n,
    to: opts.to,
    value: opts.value || 0n,
    data: opts.data
  }).sign(key);
  nonces[from.toString()] = nonce + 1n;
  const res = await vm.runTx({ tx, skipBalance: false });
  if (res.execResult.exceptionError) {
    throw new Error('tx reverted: ' + res.execResult.exceptionError.error);
  }
  return res;
}

async function main() {
  const contracts = compileAll();
  const renderer = contracts['Paperkite.sol']['Paperkite'];
  const nft = contracts['PaperkiteNFT.sol']['PaperkiteNFT'];

  const vm = await VM.create();
  await fund(vm, deployer);
  await fund(vm, payoutAcc);
  await fund(vm, buyerA);

  // deploy renderer
  let res = await send(vm, KEY_DEPLOYER, { data: '0x' + renderer.evm.bytecode.object });
  const rendererAddr = res.createdAddress;
  console.log('renderer deployed', rendererAddr.toString());

  // deploy NFT: constructor(rendererAddress, payoutAddress, initialPrice, maxSupply)
  const price = 1000000000000000n; // 0.001 ETH-equivalent unit
  const maxSupply = 3n; // small on purpose, to test sold-out path
  const ctorArgs = abi.encode(
    ['address', 'address', 'uint256', 'uint256'],
    [rendererAddr.toString(), payoutAcc.toString(), price, maxSupply]
  ).slice(2);
  res = await send(vm, KEY_DEPLOYER, { data: '0x' + nft.evm.bytecode.object + ctorArgs });
  const nftAddr = res.createdAddress;
  console.log('nft deployed', nftAddr.toString());

  const iface = new (require('ethers').Interface)(nft.abi);

  async function call(addr, data, value = 0n, key = KEY_BUYER_A) {
    return send(vm, key, { to: addr, data, value });
  }
  async function view(addr, fnFrag, args = []) {
    const data = iface.encodeFunctionData(fnFrag, args);
    const r = await vm.evm.runCall({ to: addr, data: hexToBytes(data), gasLimit: 30_000_000n });
    if (r.execResult.exceptionError) throw new Error('view reverted: ' + r.execResult.exceptionError.error);
    return iface.decodeFunctionResult(fnFrag, '0x' + Buffer.from(r.execResult.returnValue).toString('hex'));
  }

  let pass = 0, fail = 0;
  const check = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('FAIL:', name); } };

  // 1. wrong payment reverts
  try {
    await call(nftAddr, iface.encodeFunctionData('mint', []), price - 1n);
    check('wrong payment reverts', false);
  } catch (e) { check('wrong payment reverts', true); }

  // 2. correct mint works, balances move
  const payoutBefore = (await vm.stateManager.getAccount(payoutAcc)).balance;
  await call(nftAddr, iface.encodeFunctionData('mint', []), price);
  const payoutAfter = (await vm.stateManager.getAccount(payoutAcc)).balance;
  check('payout received exact price', payoutAfter - payoutBefore === price);

  const owner1 = await view(nftAddr, 'ownerOf', [1n]);
  check('token 1 owned by buyer', owner1[0].toLowerCase() === buyerA.toString().toLowerCase());

  const bal = await view(nftAddr, 'balanceOf', [buyerA.toString()]);
  check('balanceOf is 1', bal[0] === 1n);

  // 3. tokenURI decodes and matches renderer output exactly (parity through the NFT layer)
  const uriRes = await view(nftAddr, 'tokenURI', [1n]);
  const uri = uriRes[0];
  check('tokenURI has data prefix', uri.startsWith('data:application/json;base64,'));
  const json = JSON.parse(Buffer.from(uri.split(',')[1], 'base64').toString('utf8'));
  const svgFromToken = Buffer.from(json.image.split(',')[1], 'base64').toString('utf8');
  const svgDirect = engine.render(1).svg;
  check('tokenURI svg matches renderer exactly', svgFromToken === svgDirect);
  check('tokenURI traits attribute matches', json.attributes[0].value === engine.render(1).traits);
  check('tokenURI name is Paperkite #1', json.name === 'Paperkite #1');

  // 4. mint again, then sell out
  await call(nftAddr, iface.encodeFunctionData('mint', []), price); // token 2
  await call(nftAddr, iface.encodeFunctionData('mint', []), price); // token 3, hits maxSupply
  try {
    await call(nftAddr, iface.encodeFunctionData('mint', []), price); // token 4, should fail
    check('sold out reverts', false);
  } catch (e) { check('sold out reverts', true); }

  const supply = await view(nftAddr, 'totalSupply', []);
  check('totalSupply is 3', supply[0] === 3n);

  // 5. owner-only functions
  try {
    await call(nftAddr, iface.encodeFunctionData('setPrice', [123n]), 0n, KEY_BUYER_A);
    check('non-owner setPrice reverts', false);
  } catch (e) { check('non-owner setPrice reverts', true); }

  await call(nftAddr, iface.encodeFunctionData('setPrice', [123n]), 0n, KEY_PAYOUT);
  const newPrice = await view(nftAddr, 'price', []);
  check('owner setPrice works', newPrice[0] === 123n);

  // 6. royalty
  const roy = await view(nftAddr, 'royaltyInfo', [1n, 10000n]);
  check('royalty receiver is payout', roy[0].toLowerCase() === payoutAcc.toString().toLowerCase());
  check('royalty amount is 5%', roy[1] === 500n);

  // 7. transferFrom moves ownership
  await call(nftAddr, iface.encodeFunctionData('transferFrom', [buyerA.toString(), payoutAcc.toString(), 1n]), 0n, KEY_BUYER_A);
  const ownerAfterTransfer = await view(nftAddr, 'ownerOf', [1n]);
  check('transferFrom moved token', ownerAfterTransfer[0].toLowerCase() === payoutAcc.toString().toLowerCase());

  // 8. supportsInterface
  const sErc721 = await view(nftAddr, 'supportsInterface', ['0x80ac58cd']);
  const s2981 = await view(nftAddr, 'supportsInterface', ['0x2a55205a']);
  const sBad = await view(nftAddr, 'supportsInterface', ['0xdeadbeef']);
  check('supports ERC721', sErc721[0] === true);
  check('supports ERC2981', s2981[0] === true);
  check('rejects unknown interface', sBad[0] === false);

  console.log('\nchecks passed:', pass, ' failed:', fail);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
