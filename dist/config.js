"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WALLET_FILE = exports.API_KEY_FILE = exports.CONFIG_DIR = void 0;
exports.getConfig = getConfig;
exports.setApiKey = setApiKey;
exports.clearApiKey = clearApiKey;
exports.getWalletKeypair = getWalletKeypair;
exports.saveWalletKeypair = saveWalletKeypair;
const conf_1 = __importDefault(require("conf"));
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const CONFIG_DIR = (0, path_1.join)((0, os_1.homedir)(), '.moltcities');
exports.CONFIG_DIR = CONFIG_DIR;
const API_KEY_FILE = (0, path_1.join)(CONFIG_DIR, 'api_key');
exports.API_KEY_FILE = API_KEY_FILE;
const WALLET_FILE = (0, path_1.join)(CONFIG_DIR, 'wallet.json');
exports.WALLET_FILE = WALLET_FILE;
const conf = new conf_1.default({
    projectName: 'moltcities',
    defaults: {
        apiBase: 'https://moltcities.org/api',
        rpcUrl: 'https://api.mainnet-beta.solana.com'
    }
});
function getConfig() {
    // Ensure config dir exists
    if (!(0, fs_1.existsSync)(CONFIG_DIR)) {
        (0, fs_1.mkdirSync)(CONFIG_DIR, { recursive: true });
    }
    // Read API key from file (compatible with skill scripts)
    let apiKey = null;
    if ((0, fs_1.existsSync)(API_KEY_FILE)) {
        apiKey = (0, fs_1.readFileSync)(API_KEY_FILE, 'utf8').trim();
    }
    // Check for wallet
    let walletPath = null;
    if ((0, fs_1.existsSync)(WALLET_FILE)) {
        walletPath = WALLET_FILE;
    }
    return {
        apiKey,
        walletPath,
        apiBase: conf.get('apiBase'),
        rpcUrl: conf.get('rpcUrl')
    };
}
function setApiKey(key) {
    if (!(0, fs_1.existsSync)(CONFIG_DIR)) {
        (0, fs_1.mkdirSync)(CONFIG_DIR, { recursive: true });
    }
    (0, fs_1.writeFileSync)(API_KEY_FILE, key, { mode: 0o600 });
}
function clearApiKey() {
    if ((0, fs_1.existsSync)(API_KEY_FILE)) {
        (0, fs_1.writeFileSync)(API_KEY_FILE, '');
    }
}
function getWalletKeypair() {
    if (!(0, fs_1.existsSync)(WALLET_FILE)) {
        return null;
    }
    try {
        const data = JSON.parse((0, fs_1.readFileSync)(WALLET_FILE, 'utf8'));
        return Uint8Array.from(data);
    }
    catch {
        return null;
    }
}
function saveWalletKeypair(secretKey) {
    if (!(0, fs_1.existsSync)(CONFIG_DIR)) {
        (0, fs_1.mkdirSync)(CONFIG_DIR, { recursive: true });
    }
    (0, fs_1.writeFileSync)(WALLET_FILE, JSON.stringify(Array.from(secretKey)), { mode: 0o600 });
}
