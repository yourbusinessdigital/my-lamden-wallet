<script>

/* SCRIPT INIT */ 
let istestnet = false;
 let files;
 let blockexplorer;
  let wallet = { 
    loggedIn : false,
    tau: 0,
    address: "None",
    privatekey: "Unknown",
    passphrase: "",
    words24: "",
                }
    import Lamden from 'lamden-js'
    import Login from './Login.svelte';
    import Buffer from 'Buffer';

 
  let networkInfo = {
    name: 'Lamden Public Testnet',
    type: 'testnet',
    hosts: ['https://testnet-master-1.lamden.io:443']
  }

  let Net
  let sk = "";
  let vk = "";
  let keys = "";
  let humanwords = "";
  let computerwords = "";
  let hash = "";
  let privatekeyform = "";
  let TxResultHeading ="Please wait...";
  let TxResultInfo = "Getting information...";
  let TxResultHash = "";

/****************
 * Wallet functions
*/
  function testnet(testnet)
  { 
    if (testnet == true)
    { 
   istestnet = true;
   blockexplorer = "https://testnet.lamden.io/";
   networkInfo = {
    name: 'Lamden Public Testnet',
    type: 'testnet',
    hosts: ['https://testnet-master-1.lamden.io:443']
  }
  Net = new Lamden.Network({
        name: 'Lamden Public Testnet',
        type: 'testnet',
        hosts: ['https://testnet-master-1.lamden.io:443']
        })

  } else {
    istestnet = false;
    blockexplorer = "https://mainnet.lamden.io/"
    networkInfo = {
    name: 'Lamden Mainnet',
    type: 'mainnet',
    hosts: ['https://masternode-01.lamden.io:443']
  }
  Net = new Lamden.Network({
        name: 'Lamden Mainnet',
        type: 'mainnet',
        hosts: ['https://masternode-01.lamden.io:443']
        })
  }

  }


  async function login(vk, sk)
    {
      
      wallet.tau = await Net.API.getCurrencyBalance(vk);
      wallet.address = vk; 
      wallet.privatekey = sk;
      wallet.loggedIn = true;
      Net.ping();
      document.getElementById('iframe').contentWindow.location.reload();
    }
    async function refreshbalance(){
    
    wallet.tau = await Net.API.getCurrencyBalance(wallet.address);
    console.log("lol")

  } 

  function sendTAU(amount, receiver) {
    
    let senderVk = wallet.address;
    let kwargs = {
      to: receiver,
      amount: {"__fixed__":  amount.toString() }
    }
    let txInfo = {
      senderVk,
      contractName: "currency",
      methodName: "transfer",
      kwargs,
      stampLimit: 50
    }
    let tx = new Lamden.TransactionBuilder(networkInfo, txInfo)
    let senderSk = wallet.privatekey;
    tx.events.on('response', (response) => {
    if (tx.resultInfo.type === 'error') {
    TxResultHeading = tx.resultInfo.title
    TxResultInfo = tx.resultInfo.subtitle
    TxResultHash = tx.txSendResult.hash
    return
    }
    console.log(response)
    TxResultHeading = tx.resultInfo.title
    TxResultInfo = tx.resultInfo.subtitle
    TxResultHash = tx.txSendResult.hash

    })
    tx.send(senderSk).then(() => tx.checkForTransactionResult())

    PageSendTau = false;
    PageSendTauResult = true;

  }

/******************************
 *   PAGE ROUTING             *
 ******************************
 * 
 * Yeah, this is the page routing. It's large, It's clunky, It's tedious, but it works. */

  let PageLogin = false;
  let PageLoginNew = false;
  let PageLoginNew2 = false;
  let PageLoginExisting = false;
  let PageLoginExistingKeystoreFile = false;
  let PageLoginExisting24Words = false;
  let PageLoginExistingPrivateKey = false;
  let PageSendTau = false;
  let PageSendTau1 = false;
  let PageSendTauResult = false;
  PageLogin = true; 
 
  function btnExistingWallet() 
 {
  testnet(false)
  PageLogin = false;
  PageLoginExisting = true;
 } 
 function btnExistingWalletTN() 
 {
  testnet(true)
  PageLogin = false;
  PageLoginExisting = true;
 }
 function btnCreateWallet()
 {
   testnet(false)
   PageLogin = false;
   PageLoginNew = true;
   get24Words();
 }
 function btnCreateWalletTN()
{
  testnet(true)
  PageLogin = false;
   PageLoginNew = true;
   get24Words();
}

 function btnCancelAll()
 {
   PageLogin = false;
   PageLoginNew = false;
   PageLoginNew2 = false;
   PageLoginExisting = false;
   PageLoginExistingKeystoreFile = false;
   PageLoginExisting24Words = false;
   PageLoginExistingPrivateKey = false;
   PageSendTau = false;
   PageSendTau1 = false;
   PageSendTauResult = false;
 }
 function btnReset()
 {
   PageLogin = true;
   PageLoginNew = false;
   PageLoginNew2 = false;
   PageLoginExisting = false;
   PageLoginExistingKeystoreFile = false;
   PageLoginExisting24Words = false;
   PageLoginExistingPrivateKey = false;
   PageSendTau = false;
   PageSendTau1 = false;
   PageSendTauResult = false;
 }
function btnCreateWalletNext()
{
  PageLoginNew2 = false;
}
function btnLoginExistingKeystoreFile()
{
  PageLoginExisting = false;
  PageLoginExistingKeystoreFile = true;
}
function btnLoginExisting24Words ()
{
  PageLoginExisting = false;
  PageLoginExisting24Words = true;


}
async function btnLoginExisting24Words2() {
  
  hash = await bip39.mnemonicToSeed(humanwords)
  hash = hash.slice(0, 32)
  keys = Lamden.wallet.new_wallet(hash)
  login(keys.vk, keys.sk)
  PageLoginExisting24Words = false;

}
function btnLoginExistingPrivateKey () 
{
  PageLoginExisting = false;
  PageLoginExistingPrivateKey = true;
}

function btnLoginExistingPrivateKey2 () 
{
  var sk2 = document.getElementById('privatekeyform');
  sk = sk2.value;
  console.log(sk);
  PageLoginExistingPrivateKey = false;
  vk = Lamden.wallet.get_vk(sk)
  console.log(vk)
  login(vk, sk)
}
function btnConfirmWords () 
{
  PageLoginNew = false;
  PageLoginNew2 = true;
}



function btnSendTau () 
{
  PageSendTau = true;
  
}
let sendamount = ""
 let sendto = ""

function btnSendTauSend1 ()
{
/* Confirm */
PageSendTau = false;
PageSendTau1 = true;
sendamount = Lamden.Encoder('bigNumber', document.getElementById("tauamount").value)
sendto = document.getElementById("tauto").value 
}
function btnSendTauSend ()
{

  sendTAU(sendamount, sendto)
  PageSendTau1 = false;
  PageSendTauResult = true;

}
function btnSendTauClose ()
{
  PageSendTau = false;
}
function btnCloseTau () 
{
  PageSendTauResult = false;
}




/************************
 * Passcheck *
 * *********************
 * Validates the passwords match, simples.
 * TODO: Validate password length. doing an IF for password1.length > 8 doesn't work. Don't know why. I'm not going to ask why.
*/
 function passcheck() {
  var password1 = document.getElementById('password1');
  var password2 = document.getElementById('password2');
  if (password1.value != password2.value) {
    document.getElementById("completebtn").disabled = true;
    console.log("Bad");
  } 
  else {
    document.getElementById("completebtn").disabled = false;
    console.log("Good");
  }
}
/*********************
 *  Words Check
 * *******************
 * Validates the 24 words.
*/
function wordscheck() {
  var words24 = document.getElementById('words24');
  if (words24.value == humanwords) {
    document.getElementById("completebtnwords").removeAttribute("disabled");

  } else {
    document.getElementById("completebtnwords").setAttribute("disabled","disabled");

  }
}
/****
 * checks priv key fits description
*/
function privkeycheck() {
  var privkeycheck = document.getElementById('privatekeyform')
  if (privkeycheck.value.length == 64)
  {
    document.getElementById("privkeycheckbtn").disabled = false;
  } else {
    document.getElementById("privkeycheckbtn").disabled = true;

  }
}

/********************
 * unlockfile
 * *****************
 * Unlocks the keystore file. Unlock File
*/

function unlockfile() {


}
/** SHA256 function ****/
async function sha256(message) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);                    

    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // convert bytes to hex string                  
    const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
    return hashArray;
} 

/*** Functions to generate good numbers.. mostly unused   **/
const randomFloat = function () {
  const int = window.crypto.getRandomValues(new Uint32Array(1))[0]
  return int / 2**32
}
const randomInt = function (min, max) {
  const range = max - min
  return Math.floor(randomFloat() * range + min)
}

const randomIntArray = function (length, min, max) {
  return new Array(length).fill(0).map(() => randomInt(min, max))
}

async function get24Words() {

  humanwords = bip39.generateMnemonic(256)
  hash = await bip39.mnemonicToSeed(humanwords)
  hash = hash.slice(0, 32)
  keys = Lamden.wallet.new_wallet(hash)
  login(keys.vk, keys.sk)
  
}
function sha512(str) {
  return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str));
}



</script>
<svelte:head>
  <link href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css" rel="stylesheet" />
<script>

</script>
<style>main { padding:0 !important;  }
  #completebtn:disabled, #completebtnwords:disabled, button:disabled { background-color:#777 !important; color:333 }
  </style>  <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js" integrity="sha512-nOQuvD9nKirvxDdvQ9OMqe2dgapbPB7vYAMrzJihw5m+aNcf0dX53m6YxM4LgA9u8e9eg9QX+/+mPu8kCNpV2A==" crossorigin="anonymous"></script>
  <script src="/js/bip39.browser.js?PageSpeed=off"></script>
</svelte:head>
<main>

<!-- This example requires Tailwind CSS v2.0+ -->
<div class="h-screen flex overflow-hidden bg-gray-100">
  <!-- Off-canvas menu for mobile, show/hide based on off-canvas menu state. -->
  <div class="md:hidden">
    <div class="fixed inset-0 flex z-40">
      <!--
        Off-canvas menu overlay, show/hide based on off-canvas menu state.

        Entering: "transition-opacity ease-linear duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "transition-opacity ease-linear duration-300"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-600 opacity-75"></div>
      </div>
      <!--
        Off-canvas menu, show/hide based on off-canvas menu state.

        Entering: "transition ease-in-out duration-300 transform"
          From: "-translate-x-full"
          To: "translate-x-0"
        Leaving: "transition ease-in-out duration-300 transform"
          From: "translate-x-0"
          To: "-translate-x-full"
      -->
      <div class="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-700">
        <div class="absolute top-0 right-0 -mr-12 pt-2">
          <button class="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
            <span class="sr-only">Close sidebar</span>
            <!-- Heroicon name: x -->
            <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
          <div class="flex-shrink-0 flex items-center px-4">
            <img class="h-8 w-auto" src="/image/lamden.png" alt="My Lamden Wallet"> My Lamden Wallet
          </div>
          <nav class="mt-5 px-2 space-y-1">
            <!-- Current: "bg-indigo-800 text-white", Default: "text-white hover:bg-indigo-600 hover:bg-opacity-75" -->
            <span class="bg-indigo-800 text-white group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <svg class="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <svg class="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Send TAU
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <svg class="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Settings (Coming Soon)
            </span>
<!--
  
            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <svg class="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Buy TAU
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <svg class="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              Rocketswap
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-base font-medium rounded-md">
              <svg class="mr-4 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Contracts
            </span> -->
          </nav>
        </div>
        <div class="flex-shrink-0 flex border-t border-indigo-800 p-4">
          <span class="flex-shrink-0 group block">
            <div class="flex items-center">
              <div>
                <img class="inline-block h-10 w-10 rounded-full" src="/image/lamden.png" alt="">
              </div>
              <div class="ml-3">
                <p class="text-base font-medium text-white">
                  {wallet.tau} {#if istestnet}d{/if}TAU <a href="#" on:click={refreshbalance}>&#8635;</a>
                </p>
                <p class="text-sm font-medium text-indigo-200 group-hover:text-white" style="overflow-wrap:anywhere">
                  {wallet.address}
                </p>
              </div>
            </div>
          </span>
        </div>
      </div>
      <div class="flex-shrink-0 w-14" aria-hidden="true">
        <!-- Force sidebar to shrink to fit close icon -->
      </div>
    </div>
  </div>

  <!-- Static sidebar for desktop -->
  <div class="hidden bg-indigo-700 md:flex md:flex-shrink-0">
    <div class="flex flex-col w-64">
      <!-- Sidebar component, swap this element with another sidebar if you like -->
      <div class="flex flex-col h-0 flex-1">
        <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div class="flex items-center flex-shrink-0 px-4">

            <img class="h-8 w-auto" src="/image/lamden.png" alt="My Lamden Wallet"> <span class="text-sm text-white"> My Lamden Wallet</span>          </div>
          <nav class="mt-5 flex-1 px-2 space-y-1">
            <!-- Current: "bg-indigo-800 text-white", Default: "text-white hover:bg-indigo-600 hover:bg-opacity-75" -->
            <span class="bg-indigo-800 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
              <!-- Heroicon name: home -->
              <svg class="mr-3 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-sm font-medium rounded-md"  on:click={btnSendTau}>
              <svg class="mr-3 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Send TAU
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-sm font-medium rounded-md">
              <svg class="mr-3 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Settings (Coming Soon)
            </span>
<!-- 
            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-sm font-medium rounded-md">
              <svg class="mr-3 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Buy TAU
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-sm font-medium rounded-md">
              <svg class="mr-3 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              Rocketswap
            </span>

            <span class="text-white hover:bg-indigo-600 hover:bg-opacity-75 group flex items-center px-2 py-2 text-sm font-medium rounded-md">
              <svg class="mr-3 h-6 w-6 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Contracts
            </span> -->
          
          </nav>
        </div>
        <div class="flex-shrink-0 flex border-t border-indigo-800 p-4">
          <span class="flex-shrink-0 w-full group block">
            <div class="flex items-center">
              <div>
                <img class="inline-block h-9 w-9 rounded-full" src="/image/lamden.png" alt="lamden" style="    height: 30px;
                width: 30px;
                max-width: 30px;
                min-width: 30px;">
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-white">
                  {wallet.tau} {#if istestnet}d{/if}TAU <a href="#" on:click={refreshbalance}>&#8635;</a>
                </p>
                <p class="text-xs font-medium text-indigo-200 group-hover:text-white" style="overflow-wrap:anywhere">
                  {wallet.address}
                </p>
              </div>
            </div>
          </span>
        </div>
      </div>
    </div>
  </div>
  <div class="flex flex-col w-0 flex-1 overflow-hidden">
    <div class="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
      <button class="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
        <span class="sr-only">Open sidebar</span>
        <!-- Heroicon name: menu -->
        <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
    <main class="w-full	 flex-1 relative z-0 overflow-y-auto focus:outline-none" tabindex="0">
      <div class="py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {#if istestnet}        <div class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <!-- Heroicon name: information-circle -->
                <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>

         

              <div class="ml-3 flex-1 md:flex md:justify-between">
                <p class="text-sm text-brown-700">
                  You are running on TESTNET. Transactions are in dTAU. Transactions will not show in block explorer.
                </p>
                <p class="mt-3 text-sm md:mt-0 md:ml-6">
                </p>
              </div>
         
            
  </div>
          </div>
          {:else}
          <div class="rounded-md bg-blue-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <!-- Heroicon name: information-circle -->
                <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>

         

              <div class="ml-3 flex-1 md:flex md:justify-between">
                <p class="text-sm text-grey-700">
                  You are running an early build of My Lamden Wallet. Additional Features are coming soon. Please report any instabilities: luke@ideaengine.com.au.
                </p>
                <p class="mt-3 text-sm md:mt-0 md:ml-6">
                </p>
              </div>
         
            
  </div>
          </div>
          {/if}   
          <div class="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
                {wallet.tau} {#if istestnet}d{/if}TAU <a href="#" on:click={refreshbalance}>&#8635;</a>
            </h3>
            <div class="mt-3 flex sm:mt-0 sm:ml-4">
              <button type="button" class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"   on:click={btnSendTau}>
                Send TAU
              </button>
             <!--- <button disabled type="button" class="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Buy TAU
              </button>-->

            </div>
          </div>
          
                  <div class="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
                    <div class="container">
                      <iframe class="responsive-iframe" id="iframe" src="https://www.tauhq.com/addresses/{wallet.address}" style="margin-top: -140px"></iframe>
                    </div> 
                </div>
                <hr><br />
                <p style="clear:both;width:100%">
                <i>Transaction List provided by TauHQ</i></p>
        <style>.container {
          position: relative;
          overflow: hidden;
          width: 100%;
          min-width:100%;
          padding-top: 56.25%; /* 16:9 Aspect Ratio (divide 9 by 16 = 0.5625) */
        }
        
        /* Then style the iframe to fit in the container div with full height and width */
        .responsive-iframe {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          width: 100%;
          height: 100%;
        }</style>
        
        
        
        
        </div>
      </div>
    </main>
  </div>
</div>
{#if PageLogin}

<!-- This example requires Tailwind CSS v2.0+ -->
<div class="fixed z-10 inset-0 overflow-y-auto" id="login-main">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!--
        Background overlay, show/hide based on modal state.
  
        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
        <div>
          <div class="mx-auto flex items-center justify-center w-12 h-12">
            <img src="image/lamden.png" alt="lamden">
          </div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
              Welcome to My Lamden Wallet
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Please unlock your wallet, or alternatively create a new wallet to begin.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
          <button type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm" on:click={btnExistingWallet}>
            Unlock Existing Wallet
          </button>
          <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnCreateWallet}>
            Create New Wallet
          </button>
        </div>
        <hr style="margin:20px;">
<div style="width:100%;">
       <i style="font-size:70%;text-align:center;margin:0 auto;float:middle;width:auto">Alternatively, use wallet in Testnet Mode: <a href="#" on:click={btnExistingWalletTN}>Unlock</a> | <a href="#" on:click={btnCreateWalletTN}>New</a></i>
      </div>    
      </div>
    </div>
</div>
{/if}
  <!--- New Login -->
  {#if PageLoginNew}
  <div class="fixed z-10 inset-0 overflow-y-auto" id="login-new">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!--
        Background overlay, show/hide based on modal state.
  
        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
        <div>
          <div class="mx-auto flex items-center justify-center w-12 h-12">
            <img src="image/lamden.png" alt="Lamden Logo">
          </div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                Please write down these 24 words down.
              </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Write these words down physically, and store them in a secure place. These will be used to restore your wallet at anytime.              </p>       <p class="text-sm text-gray-500">
        <p>{humanwords}      </p>
            </div>
          </div>
        </div>
        <div class="">
         

          <button type="button"  id="completebtn" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm" on:click={btnConfirmWords}>
            Next
          </button>
          <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnReset}>
            Go Back 
          </button>
        </div>
      </div>
    </div>
  </div>
  {/if}
{#if PageLoginNew2}
  <div class="fixed z-10 inset-0 overflow-y-auto" id="login-new">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!--
        Background overlay, show/hide based on modal state.
  
        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
        <div>
          <div class="mx-auto flex items-center justify-center w-12 h-12">
            <img src="image/lamden.png" alt="Lamden Logo">
          </div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                  Please enter your 24 words to confirm.
                        </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
The Next button will unlock once the words have been entered correctly. If it does not unlock, please regenerate your words by reloading the page.             </p>
            </div>
          </div>
        </div>
        <div class="">
          <input type="text" id="words24" class="border py-2 px-3 text-grey-darkest w-full"  on:input={wordscheck} />
          <button disabled type="button" id="completebtnwords" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm" on:click={btnCreateWalletNext}>
            Next
          </button>
          <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnReset}>
            Go Back 
          </button>
        </div>
      </div>
    </div>
  </div>
  {/if}
  {#if PageLoginExisting}


  <!--- New Login -->
  <div class="fixed z-10 inset-0 overflow-y-auto" id="login-existing">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!--
        Background overlay, show/hide based on modal state.
  
        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
        <div>
          <div class="mx-auto flex items-center justify-center w-12 h-12">
            <img src="image/lamden.png" alt="Lamden Logo">
          </div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                Login with an Existing Wallet.
                        </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Please select what format your wallet is stored in.
            </p>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-6 sm:gap-3 sm:grid-flow-row-dense">
          <button type="button" disabled class="w-full mt-1inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm" on:click={btnLoginExistingKeystoreFile}>
            Keystore File (Coming Soon)
        </button>
        <button type="button" class="w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm" on:click={btnLoginExisting24Words}>
          24 Words
      </button>
      <button type="button" class="w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm" on:click={btnLoginExistingPrivateKey}>
        Private Key 
      </button>         <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnReset}>
        Go Back 
      </button>
        </div>
      </div>
    </div>
  </div>

  {/if}
  
  {#if PageLoginExistingKeystoreFile}


  <!--- Existing Keysotre -->
  <div class="fixed z-10 inset-0 overflow-y-auto" id="login-existing">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!--
        Background overlay, show/hide based on modal state.
  
        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
        <div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                Select your keystore file.
                        </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                <input type="file" bind:files>
                <input type="password" id="password1" class="border py-2 px-3 text-grey-darkest w-full"  on:input={unlockfile} bind:value={wallet.passphrase} />
                <button type="button" class="w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm">
                  Next 
                </button>
                <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnReset}>
                  Go Back 
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/if}
  {#if PageLoginExisting24Words}


  <!--- Existing Keysotre -->
  <div class="fixed z-10 inset-0 overflow-y-auto" id="login-existing">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!--
        Background overlay, show/hide based on modal state.
  
        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
        <div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
              Enter your 24 Word Combination to Unlock your wallet.      
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                If your wallet fails to unlock correctly, please ensure you have entered your 24 words correctly.
              </p>              <p class="text-sm text-gray-500">

                <input type="text" id="24words" class="border py-2 px-3 text-grey-darkest w-full" bind:value={humanwords} />
                <button type="button" class="w-full mt-1 mb-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm" on:click={btnLoginExisting24Words2}> 
                  Next 
                </button>
                <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnReset}>
                  Go Back 
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/if}
  {#if PageLoginExistingPrivateKey}


  <!--- Existing Keysotre -->
  <div class="fixed z-10 inset-0 overflow-y-auto" id="login-existing">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!--
        Background overlay, show/hide based on modal state.
  
        Entering: "ease-out duration-300"
          From: "opacity-0"
          To: "opacity-100"
        Leaving: "ease-in duration-200"
          From: "opacity-100"
          To: "opacity-0"
      -->
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
  
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
    
      <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
        <div>
          <div class="mt-3 text-center sm:mt-5">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                Enter your private key.
            </h3>
            <p>Reminder: We do not recommend you store an unencrypted private key on your computer, or anywhere physically not secured, as it makes it extremely trivial for anyone who has access to the key to steal your funds.</p>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                <input type="password" id="privatekeyform"   on:input={privkeycheck} class="border py-2 px-3 text-grey-darkest w-full" />
                <button type="button" id="privkeycheckbtn" disabled class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnLoginExistingPrivateKey2}>
                  Next 
                </button>
                <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnReset}>
                  Go Back 
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/if}















  {#if PageSendTau}
 <!--- Existing Keysotre -->
 <div class="fixed z-10 inset-0 overflow-y-auto" id="login-existing">
  <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <!--
      Background overlay, show/hide based on modal state.

      Entering: "ease-out duration-300"
        From: "opacity-0"
        To: "opacity-100"
      Leaving: "ease-in duration-200"
        From: "opacity-100"
        To: "opacity-0"
    -->
    <div class="fixed inset-0 transition-opacity" aria-hidden="true">
      <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
    </div>

    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
  
    <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
      <div>
        <div class="mt-3 text-center sm:mt-5">
          <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
              Send {#if istestnet}d{/if}TAU Transaction
          </h3>
          <p>You can make a {#if istestnet}d{/if}TAU transaction here.</p>
          <div class="mt-2">
            <p class="text-sm text-gray-500">
              To: 
              <input type="text" id="tauto"   class="border py-2 px-3 text-grey-darkest w-full" />
              Amount: 
              <input type="number" id="tauamount"   class="border py-2 px-3 text-grey-darkest w-full" />
              <button type="button" id="GoNext1" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnSendTauSend1}>
                Next 
              </button>
              <button type="button" id="privkeycheckbtn"  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnCancelAll}>
                Cancel 
              </button>
    
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

  {/if}
  {#if PageSendTauResult}
 <!--- Existing Keysotre -->
 <div class="fixed z-10 inset-0 overflow-y-auto" id="login-existing">
  <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <!--
      Background overlay, show/hide based on modal state.

      Entering: "ease-out duration-300"
        From: "opacity-0"
        To: "opacity-100"
      Leaving: "ease-in duration-200"
        From: "opacity-100"
        To: "opacity-0"
    -->
    <div class="fixed inset-0 transition-opacity" aria-hidden="true">
      <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
    </div>

    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
  
    <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
      <div>
        <div class="mt-3 text-center sm:mt-5">
          <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">{TxResultHeading}</h3>
          <p>{TxResultInfo}</p>
          <hr>
          <p style="margin-top:10px"><a href="{blockexplorer}transactions/{TxResultHash}" style="font-size:80%;overflow-wrap:anywhere">Tx Hash: {TxResultHash}</a></p>
          <div class="mt-2">
            <p class="text-sm text-gray-500">
              <button type="button" id="privkeycheckbtn"  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnCloseTau}>
                Okay. 
              </button>
    
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

  {/if}
  {#if PageSendTau1}
 <!--- Existing Keysotre -->
 <div class="fixed z-10 inset-0 overflow-y-auto" id="login-existing">
  <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <!--
      Background overlay, show/hide based on modal state.

      Entering: "ease-out duration-300"
        From: "opacity-0"
        To: "opacity-100"
      Leaving: "ease-in duration-200"
        From: "opacity-100"
        To: "opacity-0"
    -->
    <div class="fixed inset-0 transition-opacity" aria-hidden="true">
      <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
    </div>

    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
  
    <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-headline" id="login1">
      <div>
        <div class="mt-3 text-center sm:mt-5">
          <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">Confirm Transaction</h3>
          <p>You're sending <i style="overflow-wrap: anywhere;">{sendamount} TAU</i> to <i style="overflow-wrap: anywhere;">{sendto}</i></p>
          <div class="mt-2">
            <p class="text-sm text-gray-500">
              <button type="button" id="privkeycheckbtn"  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnSendTauSend}>
                Confirm Transaction. 
              </button> 
              <button type="button" id="privkeycheckbtn"  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm" on:click={btnCancelAll}>
                Cancel 
              </button>
    
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

  {/if}
</main>


<style>

</style> 