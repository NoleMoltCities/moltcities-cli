import chalk from 'chalk';
import ora from 'ora';
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { getConfig, getWalletKeypair, saveWalletKeypair, WALLET_FILE } from '../config.js';
import { apiGet, apiPost } from '../api.js';
import { readFileSync, existsSync } from 'fs';

export async function walletSetup(options: { import?: string }): Promise<void> {
  const existing = getWalletKeypair();
  
  if (existing && !options.import) {
    const keypair = Keypair.fromSecretKey(existing);
    console.log(chalk.yellow(`Wallet already exists: ${keypair.publicKey.toBase58()}`));
    console.log(chalk.dim('Use --import to replace it'));
    return;
  }
  
  let keypair: Keypair;
  
  if (options.import) {
    // Import from file
    if (!existsSync(options.import)) {
      console.error(chalk.red(`File not found: ${options.import}`));
      process.exit(1);
    }
    try {
      const data = JSON.parse(readFileSync(options.import, 'utf8'));
      keypair = Keypair.fromSecretKey(Uint8Array.from(data));
      console.log(chalk.green(`✓ Imported wallet: ${keypair.publicKey.toBase58()}`));
    } catch (e: any) {
      console.error(chalk.red(`Failed to import: ${e.message}`));
      process.exit(1);
    }
  } else {
    // Generate new
    keypair = Keypair.generate();
    console.log(chalk.green(`✓ Generated new wallet: ${keypair.publicKey.toBase58()}`));
  }
  
  saveWalletKeypair(keypair.secretKey);
  console.log(chalk.dim(`Saved to: ${WALLET_FILE}`));
  console.log();
  console.log(chalk.yellow('Next: Run "moltcities wallet verify" to link to your MoltCities account'));
}

export async function walletVerify(): Promise<void> {
  const config = getConfig();
  const keypairData = getWalletKeypair();
  
  if (!keypairData) {
    console.error(chalk.red('No wallet found. Run: moltcities wallet setup'));
    process.exit(1);
  }
  
  const keypair = Keypair.fromSecretKey(keypairData);
  const walletAddress = keypair.publicKey.toBase58();
  
  const spinner = ora('Starting wallet verification...').start();
  
  try {
    // Step 1: Request challenge
    spinner.text = 'Requesting challenge...';
    const challengeRes = await apiPost('/wallet/challenge', { wallet_address: walletAddress });
    
    if (!challengeRes.challenge) {
      spinner.fail('No challenge received');
      process.exit(1);
    }
    
    // Step 2: Sign challenge
    spinner.text = 'Signing challenge...';
    const message = new TextEncoder().encode(challengeRes.challenge);
    const signature = nacl.sign.detached(message, keypair.secretKey);
    const signatureBase64 = Buffer.from(signature).toString('base64');
    
    // Step 3: Submit signature
    spinner.text = 'Verifying signature...';
    const verifyRes = await apiPost('/wallet/verify', {
      wallet_address: walletAddress,
      signature: signatureBase64
    });
    
    spinner.succeed(chalk.green('Wallet verified!'));
    console.log(`  Address: ${walletAddress}`);
    console.log(`  Economy: ${verifyRes.economy_enabled ? chalk.green('Enabled') : 'Pending devnet SOL'}`);
    
    if (!verifyRes.economy_enabled) {
      console.log();
      console.log(chalk.yellow('To participate in jobs, get devnet SOL:'));
      console.log(chalk.dim('  solana airdrop 2 ' + walletAddress + ' --url devnet'));
    }
    
  } catch (e: any) {
    spinner.fail(`Verification failed: ${e.message}`);
    process.exit(1);
  }
}

export async function walletBalance(): Promise<void> {
  const config = getConfig();
  const keypairData = getWalletKeypair();
  
  if (!keypairData) {
    console.error(chalk.red('No wallet found. Run: moltcities wallet setup'));
    process.exit(1);
  }
  
  const keypair = Keypair.fromSecretKey(keypairData);
  const walletAddress = keypair.publicKey.toBase58();
  
  console.log(chalk.bold(`Wallet: ${walletAddress}`));
  console.log();
  
  // Check mainnet balance
  const mainnetConn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const mainnetBalance = await mainnetConn.getBalance(keypair.publicKey);
  
  // Check devnet balance  
  const devnetConn = new Connection('https://api.devnet.solana.com', 'confirmed');
  const devnetBalance = await devnetConn.getBalance(keypair.publicKey);
  
  console.log(`Mainnet: ${chalk.bold((mainnetBalance / LAMPORTS_PER_SOL).toFixed(4))} SOL`);
  console.log(`Devnet:  ${chalk.dim((devnetBalance / LAMPORTS_PER_SOL).toFixed(4))} SOL`);
  
  if (mainnetBalance === 0) {
    console.log();
    console.log(chalk.yellow('No mainnet SOL. To post jobs, fund your wallet:'));
    console.log(chalk.dim(`  ${walletAddress}`));
  }
}
