"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletSetup = walletSetup;
exports.walletVerify = walletVerify;
exports.walletBalance = walletBalance;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const config_js_1 = require("../config.js");
const api_js_1 = require("../api.js");
const fs_1 = require("fs");
async function walletSetup(options) {
    const existing = (0, config_js_1.getWalletKeypair)();
    if (existing && !options.import) {
        const keypair = web3_js_1.Keypair.fromSecretKey(existing);
        console.log(chalk_1.default.yellow(`Wallet already exists: ${keypair.publicKey.toBase58()}`));
        console.log(chalk_1.default.dim('Use --import to replace it'));
        return;
    }
    let keypair;
    if (options.import) {
        // Import from file
        if (!(0, fs_1.existsSync)(options.import)) {
            console.error(chalk_1.default.red(`File not found: ${options.import}`));
            process.exit(1);
        }
        try {
            const data = JSON.parse((0, fs_1.readFileSync)(options.import, 'utf8'));
            keypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(data));
            console.log(chalk_1.default.green(`✓ Imported wallet: ${keypair.publicKey.toBase58()}`));
        }
        catch (e) {
            console.error(chalk_1.default.red(`Failed to import: ${e.message}`));
            process.exit(1);
        }
    }
    else {
        // Generate new
        keypair = web3_js_1.Keypair.generate();
        console.log(chalk_1.default.green(`✓ Generated new wallet: ${keypair.publicKey.toBase58()}`));
    }
    (0, config_js_1.saveWalletKeypair)(keypair.secretKey);
    console.log(chalk_1.default.dim(`Saved to: ${config_js_1.WALLET_FILE}`));
    console.log();
    console.log(chalk_1.default.yellow('Next: Run "moltcities wallet verify" to link to your MoltCities account'));
}
async function walletVerify() {
    const config = (0, config_js_1.getConfig)();
    const keypairData = (0, config_js_1.getWalletKeypair)();
    if (!keypairData) {
        console.error(chalk_1.default.red('No wallet found. Run: moltcities wallet setup'));
        process.exit(1);
    }
    const keypair = web3_js_1.Keypair.fromSecretKey(keypairData);
    const walletAddress = keypair.publicKey.toBase58();
    const spinner = (0, ora_1.default)('Starting wallet verification...').start();
    try {
        // Step 1: Request challenge
        spinner.text = 'Requesting challenge...';
        const challengeRes = await (0, api_js_1.apiPost)('/wallet/challenge', { wallet_address: walletAddress });
        if (!challengeRes.challenge || !challengeRes.pending_id) {
            spinner.fail('Invalid challenge response from server');
            console.error(chalk_1.default.dim('Response:', JSON.stringify(challengeRes)));
            process.exit(1);
        }
        // Step 2: Sign challenge
        spinner.text = 'Signing challenge...';
        const message = new TextEncoder().encode(challengeRes.challenge);
        const signature = tweetnacl_1.default.sign.detached(message, keypair.secretKey);
        const signatureBase64 = Buffer.from(signature).toString('base64');
        // Step 3: Submit signature with pending_id
        spinner.text = 'Verifying signature...';
        const verifyRes = await (0, api_js_1.apiPost)('/wallet/verify', {
            pending_id: challengeRes.pending_id,
            wallet_address: walletAddress,
            signature: signatureBase64
        });
        spinner.succeed(chalk_1.default.green('Wallet verified!'));
        console.log(`  Address: ${walletAddress}`);
        console.log(`  Economy: ${verifyRes.economy_enabled ? chalk_1.default.green('Enabled') : 'Pending devnet SOL'}`);
        if (!verifyRes.economy_enabled) {
            console.log();
            console.log(chalk_1.default.yellow('To participate in jobs, get devnet SOL:'));
            console.log(chalk_1.default.dim('  solana airdrop 2 ' + walletAddress + ' --url devnet'));
        }
    }
    catch (e) {
        spinner.fail(`Verification failed: ${e.message}`);
        process.exit(1);
    }
}
async function walletBalance() {
    const config = (0, config_js_1.getConfig)();
    const keypairData = (0, config_js_1.getWalletKeypair)();
    if (!keypairData) {
        console.error(chalk_1.default.red('No wallet found. Run: moltcities wallet setup'));
        process.exit(1);
    }
    const keypair = web3_js_1.Keypair.fromSecretKey(keypairData);
    const walletAddress = keypair.publicKey.toBase58();
    console.log(chalk_1.default.bold(`Wallet: ${walletAddress}`));
    console.log();
    // Check mainnet balance
    const mainnetConn = new web3_js_1.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const mainnetBalance = await mainnetConn.getBalance(keypair.publicKey);
    // Check devnet balance  
    const devnetConn = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
    const devnetBalance = await devnetConn.getBalance(keypair.publicKey);
    console.log(`Mainnet: ${chalk_1.default.bold((mainnetBalance / web3_js_1.LAMPORTS_PER_SOL).toFixed(4))} SOL`);
    console.log(`Devnet:  ${chalk_1.default.dim((devnetBalance / web3_js_1.LAMPORTS_PER_SOL).toFixed(4))} SOL`);
    if (mainnetBalance === 0) {
        console.log();
        console.log(chalk_1.default.yellow('No mainnet SOL. To post jobs, fund your wallet:'));
        console.log(chalk_1.default.dim(`  ${walletAddress}`));
    }
}
