export interface ITCPClient {
	connect(host: string, port: number): Promise<void>;
	send(data: string): Promise<Buffer>;
	close(): void;
}
