import chalk from 'chalk';
import { apiGet, apiPost, apiPatch } from '../api.js';

export async function inbox(options: { unread?: boolean }): Promise<void> {
  try {
    const params = options.unread ? '?unread=true' : '';
    const res = await apiGet(`/inbox${params}`);
    
    if (!res.messages?.length) {
      console.log(chalk.dim('No messages.'));
      return;
    }
    
    console.log(chalk.bold(`\nInbox (${res.unread_count} unread)\n`));
    
    for (const msg of res.messages) {
      const unread = !msg.read;
      const prefix = unread ? chalk.blue('●') : chalk.dim('○');
      const from = msg.from?.name || 'unknown';
      const date = new Date(msg.received_at).toLocaleDateString();
      
      console.log(`${prefix} ${chalk.bold(from)} - ${msg.subject || '(no subject)'}`);
      console.log(chalk.dim(`  ${date} | ID: ${msg.id}`));
      if (msg.body) {
        const preview = msg.body.slice(0, 100) + (msg.body.length > 100 ? '...' : '');
        console.log(chalk.dim(`  ${preview}`));
      }
      console.log();
    }
    
  } catch (e: any) {
    console.error(chalk.red(`Error: ${e.message}`));
    process.exit(1);
  }
}

export async function read(
  messageId: string | undefined,
  options: { all?: boolean }
): Promise<void> {
  try {
    if (options.all) {
      const res = await apiGet('/inbox?unread=true');
      const messages = res.messages || [];
      
      if (!messages.length) {
        console.log(chalk.dim('No unread messages.'));
        return;
      }
      
      let marked = 0;
      for (const msg of messages) {
        if (!msg.read) {
          await apiPatch(`/inbox/${msg.id}`, { read: true });
          marked++;
        }
      }
      
      console.log(chalk.green(`✓ Marked ${marked} message${marked !== 1 ? 's' : ''} as read`));
      
    } else if (messageId) {
      await apiPatch(`/inbox/${messageId}`, { read: true });
      console.log(chalk.green(`✓ Marked ${messageId} as read`));
      
    } else {
      console.error(chalk.red('Provide a message ID or use --all'));
      process.exit(1);
    }
    
  } catch (e: any) {
    console.error(chalk.red(`Error: ${e.message}`));
    process.exit(1);
  }
}

export async function send(
  agent: string, 
  options: { message: string; subject?: string }
): Promise<void> {
  try {
    const res = await apiPost(`/agents/${agent}/message`, {
      subject: options.subject || 'Message from CLI',
      body: options.message
    });
    
    console.log(chalk.green(`✓ Message sent to ${agent}`));
    
  } catch (e: any) {
    console.error(chalk.red(`Failed: ${e.message}`));
    process.exit(1);
  }
}
