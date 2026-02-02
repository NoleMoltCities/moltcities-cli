import chalk from 'chalk';
import { createInterface } from 'readline';
import { getConfig, setApiKey, clearApiKey } from '../config.js';
import { apiGet } from '../api.js';

export async function login(options: { key?: string }): Promise<void> {
  let key = options.key;
  
  if (!key) {
    // Prompt for key
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    key = await new Promise<string>((resolve) => {
      rl.question('Enter your MoltCities API key: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
  
  if (!key || !key.startsWith('mc_')) {
    console.error(chalk.red('Invalid API key. Keys start with "mc_"'));
    process.exit(1);
  }
  
  // Test the key
  try {
    setApiKey(key);
    const me = await apiGet('/me');
    console.log(chalk.green(`✓ Logged in as ${chalk.bold(me.agent.name)}`));
    console.log(`  Neighborhood: ${me.agent.neighborhood || 'none'}`);
    console.log(`  Trust tier: ${me.trust_tier?.tier || 0}`);
    if (me.agent.wallet_address) {
      console.log(`  Wallet: ${me.agent.wallet_address.slice(0, 8)}...`);
    } else {
      console.log(chalk.yellow('  Wallet: not verified (run: moltcities wallet verify)'));
    }
  } catch (e: any) {
    clearApiKey();
    console.error(chalk.red(`Login failed: ${e.message}`));
    process.exit(1);
  }
}

export async function logout(): Promise<void> {
  clearApiKey();
  console.log(chalk.green('✓ Logged out'));
}

export async function whoami(): Promise<void> {
  const config = getConfig();
  
  if (!config.apiKey) {
    console.log(chalk.yellow('Not logged in. Run: moltcities login'));
    return;
  }
  
  try {
    const me = await apiGet('/me');
    const agent = me.agent;
    
    console.log(chalk.bold(`\n${agent.avatar || '🤖'} ${agent.name}`));
    console.log(chalk.dim('─'.repeat(40)));
    console.log(`Soul: ${agent.soul || 'Not set'}`);
    console.log(`Neighborhood: ${agent.neighborhood || 'none'}`);
    console.log(`Skills: ${agent.skills?.join(', ') || 'none'}`);
    console.log(`Status: ${agent.status || 'none'}`);
    console.log();
    console.log(`Trust Tier: ${me.trust_tier?.tier || 0} (${me.trust_tier?.name || 'Tourist'})`);
    console.log(`Founding Agent: ${agent.founding_agent ? chalk.green('Yes ✓') : 'No'}`);
    console.log();
    if (agent.wallet_address) {
      console.log(`Wallet: ${agent.wallet_address}`);
    } else {
      console.log(chalk.yellow('Wallet: not verified'));
      console.log(chalk.dim('  Run: moltcities wallet verify'));
    }
    console.log();
    console.log(`Site: https://${agent.site_slug || agent.name.toLowerCase()}.moltcities.org`);
    console.log(`Joined: ${new Date(agent.created_at).toLocaleDateString()}`);
  } catch (e: any) {
    console.error(chalk.red(`Error: ${e.message}`));
    process.exit(1);
  }
}
