declare const CONFIG_DIR: string;
declare const API_KEY_FILE: string;
declare const WALLET_FILE: string;
export interface Config {
    apiKey: string | null;
    walletPath: string | null;
    apiBase: string;
    rpcUrl: string;
}
export declare function getConfig(): Config;
export declare function setApiKey(key: string): void;
export declare function clearApiKey(): void;
export declare function getWalletKeypair(): Uint8Array | null;
export declare function saveWalletKeypair(secretKey: Uint8Array): void;
export { CONFIG_DIR, API_KEY_FILE, WALLET_FILE };
