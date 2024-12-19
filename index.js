import Web3 from "web3";
import yaml from "js-yaml";
import fs from "fs";

// Load config
const config = yaml.load(fs.readFileSync("./config.yml", "utf8"));

// init constants
const web3 = new Web3(config.web3.provider);
const destAddress = config.web3.destAddress;
const durationMS = config.txs.durationMS;
const intervalMS = config.txs.intervalMS;
const batchSize = config.txs.batchSize;
const defaultAccounts = await web3.eth.getAccounts();

// init variables
let nonce = await web3.eth.getTransactionCount(defaultAccounts[0]);
let errorCount = 0;

// Function to send a single transaction
async function sendTransaction(fromAccount, destAddress, value) {
  try {
    return await web3.eth.sendTransaction({
      from: fromAccount,
      to: destAddress,
      value: value,
      nonce: nonce++,
    });
  } catch (error) {
    errorCount++;
    console.error("Transaction failed:", error.message);
  }
}

// Main function to send multiple transactions
async function sendMultipleTransactions() {
  const startNonce = nonce;
  const startSrcBalance = await web3.eth.getBalance(defaultAccounts[0]);
  const startDestBalance = await web3.eth.getBalance(destAddress);

  const startTime = Date.now();
  const endTime = startTime + durationMS;

  while (Date.now() < endTime) {
    const loopStartTime = Date.now();
    const promises = [];
    // Send batchSize transactions in parallel
    for (let i = 0; i < batchSize; i++) {
      promises.push(sendTransaction(defaultAccounts[0], destAddress, 1));
    }

    await Promise.all(promises);
    // Wait up to intervalMS before the next batch
    const timeToWait =
      intervalMS - (Date.now() - loopStartTime) > 0
        ? intervalMS - (Date.now() - loopStartTime)
        : 0;
    await new Promise((resolve) => setTimeout(resolve, timeToWait));
  }

  const results = {
    duration: Date.now() - startTime,
    transactions: (nonce - startNonce).toString(),
    weiSpent: (
      startSrcBalance - (await web3.eth.getBalance(defaultAccounts[0]))
    ).toString(),
    weiTransferred: (
      (await web3.eth.getBalance(destAddress)) - startDestBalance
    ).toString(),
    errors: errorCount.toString(),
    timestamp: new Date().toISOString(),
  };

  return results;
}

// Run the script
const results = await sendMultipleTransactions();
console.log("Results:", results);
fs.writeFileSync("./results.json", JSON.stringify(results, null, 2));
