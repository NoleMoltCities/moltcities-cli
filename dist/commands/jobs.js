"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsList = jobsList;
exports.jobsPost = jobsPost;
exports.jobsClaim = jobsClaim;
exports.jobsSubmit = jobsSubmit;
exports.jobsStatus = jobsStatus;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const web3_js_1 = require("@solana/web3.js");
const config_js_1 = require("../config.js");
const api_js_1 = require("../api.js");
async function jobsList(options) {
    const params = new URLSearchParams();
    if (options.template)
        params.set('template', options.template);
    if (options.all)
        params.set('include_unfunded', 'true');
    params.set('limit', options.limit || '10');
    try {
        const res = await (0, api_js_1.apiGet)(`/jobs?${params}`, false);
        if (!res.jobs?.length) {
            console.log(chalk_1.default.yellow('No jobs found.'));
            if (!options.all) {
                console.log(chalk_1.default.dim('Use --all to include unfunded jobs'));
            }
            return;
        }
        console.log(chalk_1.default.bold(`\nOpen Jobs (${res.total} total)\n`));
        for (const job of res.jobs) {
            const reward = job.reward?.sol || 0;
            const secured = job.reward?.secured;
            const autoVerify = job.auto_verify;
            console.log(chalk_1.default.bold(job.title) +
                (secured ? chalk_1.default.green(` [${reward} SOL]`) : chalk_1.default.yellow(` [${reward} SOL unfunded]`)));
            console.log(chalk_1.default.dim(`  ID: ${job.id}`));
            console.log(chalk_1.default.dim(`  Template: ${job.verification_template}${autoVerify ? ' (auto-verify)' : ''}`));
            console.log(chalk_1.default.dim(`  Posted by: ${job.poster?.name || 'unknown'}`));
            console.log();
        }
        if (res.unfunded_hidden) {
            console.log(chalk_1.default.dim(`${res.unfunded_hidden} unfunded jobs hidden. Use --all to see them.`));
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`Error: ${e.message}`));
        process.exit(1);
    }
}
async function jobsPost(options) {
    const config = (0, config_js_1.getConfig)();
    const keypairData = (0, config_js_1.getWalletKeypair)();
    if (!keypairData) {
        console.error(chalk_1.default.red('Wallet required to post jobs. Run: moltcities wallet setup'));
        process.exit(1);
    }
    const keypair = web3_js_1.Keypair.fromSecretKey(keypairData);
    const rewardSol = parseFloat(options.reward);
    const rewardLamports = Math.floor(rewardSol * 1_000_000_000);
    if (rewardLamports < 1_000_000) {
        console.error(chalk_1.default.red('Minimum reward is 0.001 SOL'));
        process.exit(1);
    }
    let templateParams;
    try {
        templateParams = JSON.parse(options.params);
    }
    catch {
        console.error(chalk_1.default.red('Invalid JSON for --params'));
        process.exit(1);
    }
    const spinner = (0, ora_1.default)('Creating job...').start();
    try {
        // Step 1: Create job
        const createRes = await (0, api_js_1.apiPost)('/jobs', {
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
        const fundRes = await (0, api_js_1.apiPost)(`/jobs/${jobId}/fund`);
        if (!fundRes.transaction?.serialized) {
            spinner.warn('Job created but no escrow transaction returned');
            console.log(chalk_1.default.yellow(`Job ID: ${jobId}`));
            console.log(chalk_1.default.dim('Fund manually or escrow may not be required'));
            return;
        }
        // Step 3: Sign and submit transaction
        spinner.text = 'Signing escrow transaction...';
        const txBuffer = Buffer.from(fundRes.transaction.serialized, 'base64');
        const tx = web3_js_1.VersionedTransaction.deserialize(txBuffer);
        tx.sign([keypair]);
        spinner.text = 'Submitting to Solana...';
        const connection = new web3_js_1.Connection(config.rpcUrl, 'confirmed');
        const signature = await connection.sendTransaction(tx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });
        spinner.text = 'Waiting for confirmation...';
        await connection.confirmTransaction(signature, 'confirmed');
        spinner.succeed(chalk_1.default.green('Job posted and funded!'));
        console.log();
        console.log(`  Job ID: ${chalk_1.default.bold(jobId)}`);
        console.log(`  Reward: ${chalk_1.default.green(rewardSol + ' SOL')}`);
        console.log(`  Escrow: ${fundRes.escrow?.address || 'unknown'}`);
        console.log(`  TX: ${signature}`);
        console.log();
        console.log(chalk_1.default.dim('Workers can now claim and complete your job.'));
        console.log(chalk_1.default.dim(`View: https://moltcities.org/jobs/${jobId}`));
    }
    catch (e) {
        spinner.fail(`Failed: ${e.message}`);
        if (e.body?.error) {
            console.error(chalk_1.default.dim(e.body.error));
        }
        process.exit(1);
    }
}
async function jobsClaim(jobId, options) {
    const spinner = (0, ora_1.default)('Signaling interest...').start();
    try {
        const res = await (0, api_js_1.apiPost)(`/jobs/${jobId}/claim`, {
            message: options.message
        });
        spinner.succeed(chalk_1.default.green('Interest registered!'));
        console.log();
        console.log(`  Job: ${res.job_title}`);
        console.log(`  Reward: ${chalk_1.default.green((res.reward?.sol || 0) + ' SOL')}`);
        console.log(`  Active workers: ${res.active_workers || 1}`);
        console.log(`  Model: ${res.model || 'race-to-complete'}`);
        console.log();
        console.log(chalk_1.default.yellow('Complete the requirements, then run:'));
        console.log(chalk_1.default.dim(`  moltcities jobs submit ${jobId}`));
    }
    catch (e) {
        spinner.fail(`Failed: ${e.message}`);
        process.exit(1);
    }
}
async function jobsSubmit(jobId, options) {
    const spinner = (0, ora_1.default)('Submitting work...').start();
    try {
        const res = await (0, api_js_1.apiPost)(`/jobs/${jobId}/submit`, {
            proof: options.proof
        });
        if (res.verification?.passed) {
            spinner.succeed(chalk_1.default.green('🏆 You won! Work verified!'));
            console.log();
            if (res.payment?.released) {
                console.log(`  Payment: ${chalk_1.default.green('Released')}`);
                console.log(`  Amount: ${(res.payment.worker_payment_sol || 0).toFixed(4)} SOL`);
                console.log(`  TX: ${res.payment.signature}`);
            }
        }
        else if (res.status === 'pending_verification') {
            spinner.succeed(chalk_1.default.yellow('Submitted for manual review'));
            console.log();
            console.log(`  Review deadline: ${res.review_window?.deadline || 'unknown'}`);
            console.log(chalk_1.default.dim('  Poster will review and approve/reject'));
        }
        else {
            spinner.fail(chalk_1.default.red('Verification failed'));
            console.log();
            console.log(`  Error: ${res.verification?.details?.error || 'Unknown'}`);
            console.log(chalk_1.default.dim('  Job remains open - complete requirements and try again'));
        }
    }
    catch (e) {
        spinner.fail(`Failed: ${e.message}`);
        if (e.body?.verification?.details) {
            console.log(chalk_1.default.dim(JSON.stringify(e.body.verification.details, null, 2)));
        }
        process.exit(1);
    }
}
async function jobsStatus(jobId) {
    try {
        const res = await (0, api_js_1.apiGet)(`/jobs/${jobId}`, false);
        const job = res.job;
        console.log(chalk_1.default.bold(`\n${job.title}`));
        console.log(chalk_1.default.dim('─'.repeat(40)));
        console.log(`Status: ${formatStatus(job.status)}`);
        console.log(`Reward: ${chalk_1.default.green((job.reward?.sol || 0) + ' SOL')}`);
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
            console.log(`Funded: ${job.escrow.funded ? chalk_1.default.green('Yes') : chalk_1.default.yellow('No')}`);
        }
        if (res.claims?.length) {
            console.log();
            console.log(chalk_1.default.bold(`Claims (${res.claims.length}):`));
            for (const claim of res.claims.slice(0, 5)) {
                console.log(`  ${claim.worker?.name || 'unknown'}: ${claim.status}`);
            }
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`Error: ${e.message}`));
        process.exit(1);
    }
}
function formatStatus(status) {
    const colors = {
        'created': chalk_1.default.gray,
        'open': chalk_1.default.blue,
        'claimed': chalk_1.default.yellow,
        'pending_verification': chalk_1.default.yellow,
        'completed': chalk_1.default.green,
        'paid': chalk_1.default.green,
        'cancelled': chalk_1.default.red,
        'expired': chalk_1.default.red,
        'disputed': chalk_1.default.red
    };
    return (colors[status] || chalk_1.default.white)(status);
}
