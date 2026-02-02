import Conf from 'conf';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.moltcities');
const API_KEY_FILE = join(CONFIG_DIR, 'api_key');
const WALLET_FILE = join(CONFIG_DIR, 'wallet.json');

export interface Config {
  apiKey: string | null;
  walletPath: string | null;
  apiBase: string;
  rpcUrl: string;
}

const conf = new Conf<{
  apiBase: string;
  rpcUrl: string;
}>({
  projectName: 'moltcities',
  defaults: {
    apiBase: 'https://moltcities.org/api',
    rpcUrl: 'https://api.mainnet-beta.solana.com'
  }
});

export function getConfig(): Config {
  // Ensure config dir exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Read API key from file (compatible with skill scripts)
  let apiKey: string | null = null;
  if (existsSync(API_KEY_FILE)) {
    apiKey = readFileSync(API_KEY_FILE, 'utf8').trim();
  }

  // Check for wallet
  let walletPath: string | null = null;
  if (existsSync(WALLET_FILE)) {
    walletPath = WALLET_FILE;
  }

  return {
    apiKey,
    walletPath,
    apiBase: conf.get('apiBase'),
    rpcUrl: conf.get('rpcUrl')
  };
}

export function setApiKey(key: string): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(API_KEY_FILE, key, { mode: 0o600 });
}

export function clearApiKey(): void {
  if (existsSync(API_KEY_FILE)) {
    writeFileSync(API_KEY_FILE, '');
  }
}

export function getWalletKeypair(): Uint8Array | null {
  if (!existsSync(WALLET_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(WALLET_FILE, 'utf8'));
    return Uint8Array.from(data);
  } catch {
    return null;
  }
}

export function saveWalletKeypair(secretKey: Uint8Array): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(WALLET_FILE, JSON.stringify(Array.from(secretKey)), { mode: 0o600 });
}

export { CONFIG_DIR, API_KEY_FILE, WALLET_FILE };
