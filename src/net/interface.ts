export interface ITCPClient {
    connect(host: string, port: number): Promise<void>;
    send(data: string): Promise<void>;
    receive(): Promise<Buffer>;
    close(): Promise<void>;
}