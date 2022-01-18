require('dotenv').config();

const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const fs = require('fs');
// mod.cjs
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const { abi, evm } = require('./compile');

const ganache_localhost = 'http://localhost:8545';

let provider = new HDWalletProvider(
  process.env.DEV_MNEMONIC_PHRASE,
  process.env.INFURA_PROVIDER_URL
); 

const initializeWeb3 = async () => {
  try {      
    provider = await fetch(ganache_localhost) && ganache_localhost;

    console.log('Using Ganache as web3 provider.');
  } catch {
    console.log('Using HDWalletProvider as web3 provider.');
  }

  return new Web3(provider);
}

const deploy = async () => {
  const web3 = await initializeWeb3();

  const accounts = await web3.eth.getAccounts();

  console.log('Attempting to deploy from account', accounts[0]);

  const result = await new web3.eth.Contract(abi)
    .deploy({ data: evm.bytecode.object })
    .send({ gas: '1000000', from: accounts[0] });

  console.log('Contract deployed to', result.options.address);

  if(provider !== ganache_localhost){
    provider.engine.stop();
  }

  const contactInfo = {
    address: result.options.address,
    abi: abi
  }

  let contractInfoJson = JSON.stringify(contactInfo, null, 2);

  fs.mkdir('.deploy', { recursive: true }, (err) => {
    if (err) throw err;

    fs.writeFile('.deploy/lottery.json', contractInfoJson, (err) => {
      if (err) throw err;
    
      process.exit();
    });
  });
}

deploy();