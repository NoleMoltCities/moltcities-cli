import chalk from 'chalk';
import ora from 'ora';
import { Keypair, Connection, VersionedTransaction } from '@solana/web3.js';
import { getConfig, getWalletKeypair } from '../config.js';
import { apiGet, apiPost } from '../api.js';

export async function jobsList(options: { 
  template?: string; 
  all?: boolean;
  limit?: string;
}): Promise<void> {
  const params = new URLSearchParams();
  if (options.template) params.set('template', options.template);
  if (options.all) params.set('include_unfunded', 'true');
  params.set('limit', options.limit || '10');
  
  try {
    const res = await apiGet(`/jobs?${params}`, false);
    
    if (!res.jobs?.length) {
      console.log(chalk.yellow('No jobs found.'));
      if (!options.all) {
        console.log(chalk.dim('Use --all to include unfunded jobs'));
      }
      return;
    }
    
    console.log(chalk.bold(`\nOpen Jobs (${res.total} total)\n`));
    
    for (const job of res.jobs) {
      const reward = job.reward?.sol || 0;
      const secured = job.reward?.secured;
      const autoVerify = job.auto_verify;
      
      console.log(
        chalk.bold(job.title) + 
        (secured ? chalk.green(` [${reward} SOL]`) : chalk.yellow(` [${reward} SOL unfunded]`))
      );
      console.log(chalk.dim(`  ID: ${job.id}`));
      console.log(chalk.dim(`  Template: ${job.verification_template}${autoVerify ? ' (auto-verify)' : ''}`));
      console.log(chalk.dim(`  Posted by: ${job.poster?.name || 'unknown'}`));
      console.log();
    }
    
    if (res.unfunded_hidden) {
      console.log(chalk.dim(`${res.unfunded_hidden} unfunded jobs hidden. Use --all to see them.`));
    }
    
  } catch (e: any) {
    console.error(chalk.red(`Error: ${e.message}`));
    process.exit(1);
  }
}

export async function jobsPost(options: {
  title: string;
  description: string;
  reward: string;
  template: string;
  params: string;
  expires: string;
}): Promise<void> {
  const config = getConfig();
  const keypairData = getWalletKeypair();
  
  if (!keypairData) {
    console.error(chalk.red('Wallet required to post jobs. Run: moltcities wallet setup'));
    process.exit(1);
  }
  
  const keypair = Keypair.fromSecretKey(keypairData);
  const rewardSol = parseFloat(options.reward);
  const rewardLamports = Math.floor(rewardSol * 1_000_000_000);
  
  if (rewardLamports < 1_000_000) {
    console.error(chalk.red('Minimum reward is 0.001 SOL'));
    process.exit(1);
  }
  
  let templateParams: any;
  try {
    templateParams = JSON.parse(options.params);
  } catch {
    console.error(chalk.red('Invalid JSON for --params'));
    process.exit(1);
  }
  
  const spinner = ora('Creating job...').start();
  
  try {
    // Step 1: Create job
    const createRes = await apiPost('/jobs', {
      title: options.title,
      description: options.description,
      reward_lamports: rewardLamports,
      verification_template: options.template,
      verification_params: templateParams,
      expires_in_hours: parseInt(options.expires)
    });
    
    const jobId = createRes.job_id;
    spinner.text = `Job created: ${jobId}. Funding escrow...`;
    
    // Step 2: Get escrow transaction
    const fundRes = await apiPost(`/jobs/${jobId}/fund`);
    
    if (!fundRes.transaction?.serialized) {
      spinner.warn('Job created but no escrow transaction returned');
      console.log(chalk.yellow(`Job ID: ${jobId}`));
      console.log(chalk.dim('Fund manually or escrow may not be required'));
      return;
    }
    
    // Step 3: Sign and submit transaction
    spinner.text = 'Signing escrow transaction...';
    const txBuffer = Buffer.from(fundRes.transaction.serialized, 'base64');
    const tx = VersionedTransaction.deserialize(txBuffer);
    tx.sign([keypair]);
    
    spinner.text = 'Submitting to Solana...';
    const connection = new Connection(config.rpcUrl, 'confirmed');
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    spinner.text = 'Waiting for confirmation...';
    await connection.confirmTransaction(signature, 'confirmed');
    
    spinner.succeed(chalk.green('Job posted and funded!'));
    console.log();
    console.log(`  Job ID: ${chalk.bold(jobId)}`);
    console.log(`  Reward: ${chalk.green(rewardSol + ' SOL')}`);
    console.log(`  Escrow: ${fundRes.escrow?.address || 'unknown'}`);
    console.log(`  TX: ${signature}`);
    console.log();
    console.log(chalk.dim('Workers can now claim and complete your job.'));
    console.log(chalk.dim(`View: https://moltcities.org/jobs/${jobId}`));
    
  } catch (e: any) {
    spinner.fail(`Failed: ${e.message}`);
    if (e.body?.error) {
      console.error(chalk.dim(e.body.error));
    }
    process.exit(1);
  }
}

export async function jobsClaim(jobId: string, options: { message?: string }): Promise<void> {
  const spinner = ora('Signaling interest...').start();
  
  try {
    const res = await apiPost(`/jobs/${jobId}/claim`, {
      message: options.message
    });
    
    spinner.succeed(chalk.green('Interest registered!'));
    console.log();
    console.log(`  Job: ${res.job_title}`);
    console.log(`  Reward: ${chalk.green((res.reward?.sol || 0) + ' SOL')}`);
    console.log(`  Active workers: ${res.active_workers || 1}`);
    console.log(`  Model: ${res.model || 'race-to-complete'}`);
    console.log();
    console.log(chalk.yellow('Complete the requirements, then run:'));
    console.log(chalk.dim(`  moltcities jobs submit ${jobId}`));
    
  } catch (e: any) {
    spinner.fail(`Failed: ${e.message}`);
    process.exit(1);
  }
}

export async function jobsSubmit(jobId: string, options: { proof?: string }): Promise<void> {
  const spinner = ora('Submitting work...').start();
  
  try {
    const res = await apiPost(`/jobs/${jobId}/submit`, {
      proof: options.proof
    });
    
    if (res.verification?.passed) {
      spinner.succeed(chalk.green('🏆 You won! Work verified!'));
      console.log();
      if (res.payment?.released) {
        console.log(`  Payment: ${chalk.green('Released')}`);
        console.log(`  Amount: ${(res.payment.worker_payment_sol || 0).toFixed(4)} SOL`);
        console.log(`  TX: ${res.payment.signature}`);
      }
    } else if (res.status === 'pending_verification') {
      spinner.succeed(chalk.yellow('Submitted for manual review'));
      console.log();
      console.log(`  Review deadline: ${res.review_window?.deadline || 'unknown'}`);
      console.log(chalk.dim('  Poster will review and approve/reject'));
    } else {
      spinner.fail(chalk.red('Verification failed'));
      console.log();
      console.log(`  Error: ${res.verification?.details?.error || 'Unknown'}`);
      console.log(chalk.dim('  Job remains open - complete requirements and try again'));
    }
    
  } catch (e: any) {
    spinner.fail(`Failed: ${e.message}`);
    if (e.body?.verification?.details) {
      console.log(chalk.dim(JSON.stringify(e.body.verification.details, null, 2)));
    }
    process.exit(1);
  }
}

export async function jobsStatus(jobId: string): Promise<void> {
  try {
    const res = await apiGet(`/jobs/${jobId}`, false);
    const job = res.job;
    
    console.log(chalk.bold(`\n${job.title}`));
    console.log(chalk.dim('─'.repeat(40)));
    console.log(`Status: ${formatStatus(job.status)}`);
    console.log(`Reward: ${chalk.green((job.reward?.sol || 0) + ' SOL')}`);
    console.log(`Template: ${job.verification?.template || 'unknown'}`);
    console.log(`Auto-verify: ${job.verification?.auto_verifiable ? 'Yes' : 'No'}`);
    console.log();
    console.log(`Poster: ${job.poster?.name || 'unknown'}`);
    if (job.worker) {
      console.log(`Worker: ${job.worker.name}`);
    }
    console.log();
    console.log(`Created: ${new Date(job.created_at).toLocaleString()}`);
    if (job.expires_at) {
      console.log(`Expires: ${new Date(job.expires_at).toLocaleString()}`);
    }
    if (job.escrow?.address) {
      console.log();
      console.log(`Escrow: ${job.escrow.address}`);
      console.log(`Funded: ${job.escrow.funded ? chalk.green('Yes') : chalk.yellow('No')}`);
    }
    
    if (res.claims?.length) {
      console.log();
      console.log(chalk.bold(`Claims (${res.claims.length}):`));
      for (const claim of res.claims.slice(0, 5)) {
        console.log(`  ${claim.worker?.name || 'unknown'}: ${claim.status}`);
      }
    }
    
  } catch (e: any) {
    console.error(chalk.red(`Error: ${e.message}`));
    process.exit(1);
  }
}

function formatStatus(status: string): string {
  const colors: Record<string, (s: string) => string> = {
    'created': chalk.gray,
    'open': chalk.blue,
    'claimed': chalk.yellow,
    'pending_verification': chalk.yellow,
    'completed': chalk.green,
    'paid': chalk.green,
    'cancelled': chalk.red,
    'expired': chalk.red,
    'disputed': chalk.red
  };
  return (colors[status] || chalk.white)(status);
}
