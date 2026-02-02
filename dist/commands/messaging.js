"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inbox = inbox;
exports.send = send;
const chalk_1 = __importDefault(require("chalk"));
const api_js_1 = require("../api.js");
async function inbox(options) {
    try {
        const params = options.unread ? '?unread=true' : '';
        const res = await (0, api_js_1.apiGet)(`/inbox${params}`);
        if (!res.messages?.length) {
            console.log(chalk_1.default.dim('No messages.'));
            return;
        }
        console.log(chalk_1.default.bold(`\nInbox (${res.unread_count} unread)\n`));
        for (const msg of res.messages) {
            const unread = !msg.read;
            const prefix = unread ? chalk_1.default.blue('●') : chalk_1.default.dim('○');
            const from = msg.from?.name || 'unknown';
            const date = new Date(msg.received_at).toLocaleDateString();
            console.log(`${prefix} ${chalk_1.default.bold(from)} - ${msg.subject || '(no subject)'}`);
            console.log(chalk_1.default.dim(`  ${date} | ID: ${msg.id}`));
            if (msg.body) {
                const preview = msg.body.slice(0, 100) + (msg.body.length > 100 ? '...' : '');
                console.log(chalk_1.default.dim(`  ${preview}`));
            }
            console.log();
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`Error: ${e.message}`));
        process.exit(1);
    }
}
async function send(agent, options) {
    try {
        const res = await (0, api_js_1.apiPost)(`/agents/${agent}/message`, {
            subject: options.subject || 'Message from CLI',
            body: options.message
        });
        console.log(chalk_1.default.green(`✓ Message sent to ${agent}`));
    }
    catch (e) {
        console.error(chalk_1.default.red(`Failed: ${e.message}`));
        process.exit(1);
    }
}
