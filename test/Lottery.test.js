require('dotenv').config();

const assert = require('assert');
// mod.cjs
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const ganache = require('ganache-cli');
const Web3 = require('web3');

const { abi, evm } = require('../compile');

const ganache_localhost = 'http://localhost:8545';

let web3;
let accounts;
let lottery;

const initializeWeb3 = async () => {
  const options = { mnemonic: process.env.TEST_MNEMONIC_PHRASE };
  let provider = ganache.provider(options);

  try {
    provider = await fetch(ganache_localhost) && ganache_localhost;

    console.log('Using Ganache as web3 provider.');
  } catch {
    console.log('Using ganache-cli as web3 provider.');
  }

  return new Web3(provider);
}

before(async () => {
  // Initialize web3 provider
  web3 = await initializeWeb3();

  // Get a list of all account
  accounts = await web3.eth.getAccounts();
});

beforeEach(async () => {
  // Deploy the contract
  lottery = await new web3.eth.Contract(abi)
    .deploy({ data: evm.bytecode.object })
    .send({ from: accounts[0], gas: '1000000' });
});

describe('Lottery Contract', () => {
  it('deploys a contract', () => {      
    assert.ok(lottery.options.address);
  });

  it('has a manager', async () => {
    const manager = await lottery.methods.manager().call();
    assert.equal(manager, accounts[0]);
  });

  it('allows one account to enter', async () => {
    await lottery.methods.enter().send({ 
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });
    
    const players = await lottery.methods.getPlayers().call({ 
      from: accounts[0] 
    });

    assert(players);
    assert.equal(1, players.length);
    assert.equal(players[0], accounts[0]);
  });

  it('allows multiple accounts to enter', async () => {
    let accountIndex = 0;

    while(accountIndex < 3){
      await lottery.methods.enter().send({ 
        from: accounts[accountIndex++],
        value: web3.utils.toWei('0.02', 'ether')
      });
    }
    
    const players = await lottery.methods.getPlayers().call({ 
      from: accounts[0] 
    });

    assert(players);
    assert.equal(3, players.length);
    assert.equal(players[0], accounts[0]);
    assert.equal(players[1], accounts[1]);
    assert.equal(players[2], accounts[2]);
  });

  it('it requires a minimun amout of ether to enter', async () => {
    try{
      await lottery.methods.enter().send({ 
        from: accounts[0],
        value: 200
      });

      assert.fail('enter should not have succeeded.');
    }
    catch(err){
      assert.match(err.message, /Amount of ether sent is not enought/);
    }   
  });

  it('only manager can call pickWinner', async () => {
    try{
      await lottery.methods.pickWinner().send({ 
        from: accounts[1]
      });

      assert.fail('pickWinner should not have succeeded.');
    }
    catch(err){
      assert.match(err.message, /Only manager can pick a winner/);
    }  
  });

  it('send money to the winner and reset the players array', async () => {
    await lottery.methods.enter().send({ 
      from: accounts[0],
      value: web3.utils.toWei('2', 'ether')
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]);

    await lottery.methods.pickWinner().send({ 
      from: accounts[0]
    });

    const finalBalance = await web3.eth.getBalance(accounts[0]);  

    assert(finalBalance - initialBalance > web3.utils.toWei('1.8', 'ether'));
  });
});