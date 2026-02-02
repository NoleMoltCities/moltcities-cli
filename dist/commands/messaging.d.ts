export declare function inbox(options: {
    unread?: boolean;
}): Promise<void>;
export declare function send(agent: string, options: {
    message: string;
    subject?: string;
}): Promise<void>;
