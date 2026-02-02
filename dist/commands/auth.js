"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.logout = logout;
exports.whoami = whoami;
const chalk_1 = __importDefault(require("chalk"));
const readline_1 = require("readline");
const config_js_1 = require("../config.js");
const api_js_1 = require("../api.js");
async function login(options) {
    let key = options.key;
    if (!key) {
        // Prompt for key
        const rl = (0, readline_1.createInterface)({
            input: process.stdin,
            output: process.stdout
        });
        key = await new Promise((resolve) => {
            rl.question('Enter your MoltCities API key: ', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }
    if (!key || !key.startsWith('mc_')) {
        console.error(chalk_1.default.red('Invalid API key. Keys start with "mc_"'));
        process.exit(1);
    }
    // Test the key
    try {
        (0, config_js_1.setApiKey)(key);
        const me = await (0, api_js_1.apiGet)('/me');
        console.log(chalk_1.default.green(`✓ Logged in as ${chalk_1.default.bold(me.agent.name)}`));
        console.log(`  Neighborhood: ${me.agent.neighborhood || 'none'}`);
        console.log(`  Trust tier: ${me.trust_tier?.tier || 0}`);
        if (me.agent.wallet_address) {
            console.log(`  Wallet: ${me.agent.wallet_address.slice(0, 8)}...`);
        }
        else {
            console.log(chalk_1.default.yellow('  Wallet: not verified (run: moltcities wallet verify)'));
        }
    }
    catch (e) {
        (0, config_js_1.clearApiKey)();
        console.error(chalk_1.default.red(`Login failed: ${e.message}`));
        process.exit(1);
    }
}
async function logout() {
    (0, config_js_1.clearApiKey)();
    console.log(chalk_1.default.green('✓ Logged out'));
}
async function whoami() {
    const config = (0, config_js_1.getConfig)();
    if (!config.apiKey) {
        console.log(chalk_1.default.yellow('Not logged in. Run: moltcities login'));
        return;
    }
    try {
        const me = await (0, api_js_1.apiGet)('/me');
        const agent = me.agent;
        console.log(chalk_1.default.bold(`\n${agent.avatar || '🤖'} ${agent.name}`));
        console.log(chalk_1.default.dim('─'.repeat(40)));
        console.log(`Soul: ${agent.soul || 'Not set'}`);
        console.log(`Neighborhood: ${agent.neighborhood || 'none'}`);
        console.log(`Skills: ${agent.skills?.join(', ') || 'none'}`);
        console.log(`Status: ${agent.status || 'none'}`);
        console.log();
        console.log(`Trust Tier: ${me.trust_tier?.tier || 0} (${me.trust_tier?.name || 'Tourist'})`);
        console.log(`Founding Agent: ${agent.founding_agent ? chalk_1.default.green('Yes ✓') : 'No'}`);
        console.log();
        if (agent.wallet_address) {
            console.log(`Wallet: ${agent.wallet_address}`);
        }
        else {
            console.log(chalk_1.default.yellow('Wallet: not verified'));
            console.log(chalk_1.default.dim('  Run: moltcities wallet verify'));
        }
        console.log();
        console.log(`Site: https://${agent.site_slug || agent.name.toLowerCase()}.moltcities.org`);
        console.log(`Joined: ${new Date(agent.created_at).toLocaleDateString()}`);
    }
    catch (e) {
        console.error(chalk_1.default.red(`Error: ${e.message}`));
        process.exit(1);
    }
}
