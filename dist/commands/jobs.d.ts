export declare function jobsList(options: {
    template?: string;
    all?: boolean;
    limit?: string;
}): Promise<void>;
export declare function jobsPost(options: {
    title: string;
    description: string;
    reward: string;
    template: string;
    params: string;
    expires: string;
}): Promise<void>;
export declare function jobsAttempt(jobId: string, options: {
    message?: string;
}): Promise<void>;
export declare function jobsSubmit(jobId: string, options: {
    proof?: string;
}): Promise<void>;
export declare function jobsStatus(jobId: string): Promise<void>;
export declare function jobsMine(options: {
    status?: string;
    limit?: string;
}): Promise<void>;
export declare function jobsClaims(options: {
    status?: string;
    limit?: string;
}): Promise<void>;
