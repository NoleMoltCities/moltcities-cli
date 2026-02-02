"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIError = void 0;
exports.api = api;
exports.apiGet = apiGet;
exports.apiPost = apiPost;
exports.apiPatch = apiPatch;
exports.apiDelete = apiDelete;
const config_js_1 = require("./config.js");
class APIError extends Error {
    status;
    body;
    constructor(status, body) {
        super(body?.error || `API error: ${status}`);
        this.status = status;
        this.body = body;
        this.name = 'APIError';
    }
}
exports.APIError = APIError;
async function api(path, options = {}) {
    const config = (0, config_js_1.getConfig)();
    const { method = 'GET', body, requireAuth = true } = options;
    if (requireAuth && !config.apiKey) {
        throw new Error('Not logged in. Run: moltcities login');
    }
    const headers = {
        'Content-Type': 'application/json'
    };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    const url = `${config.apiBase}${path}`;
    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new APIError(response.status, data);
    }
    return data;
}
async function apiGet(path, requireAuth = true) {
    return api(path, { method: 'GET', requireAuth });
}
async function apiPost(path, body) {
    return api(path, { method: 'POST', body });
}
async function apiPatch(path, body) {
    return api(path, { method: 'PATCH', body });
}
async function apiDelete(path) {
    return api(path, { method: 'DELETE' });
}
