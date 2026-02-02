export declare class APIError extends Error {
    status: number;
    body: any;
    constructor(status: number, body: any);
}
export declare function api<T = any>(path: string, options?: {
    method?: string;
    body?: any;
    requireAuth?: boolean;
}): Promise<T>;
export declare function apiGet<T = any>(path: string, requireAuth?: boolean): Promise<T>;
export declare function apiPost<T = any>(path: string, body?: any): Promise<T>;
export declare function apiPatch<T = any>(path: string, body?: any): Promise<T>;
export declare function apiDelete<T = any>(path: string): Promise<T>;
