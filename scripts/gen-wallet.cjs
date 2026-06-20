const { Mnemonic, HDNodeWallet, Wallet } = require("ethers");

const random = Wallet.createRandom();
const phrase = random.mnemonic.phrase;
const mnemonic = Mnemonic.fromPhrase(phrase);

console.log("DEMO_MNEMONIC:", phrase);
console.log("");
for (let i = 0; i < 5; i++) {
  const acct = HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`);
  console.log(`index ${i}  address ${acct.address}  key ${acct.privateKey}`);
}
