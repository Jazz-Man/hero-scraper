import { connect, type TCPSocket } from "bun";
import BaseTCPClient from "./base.ts";
import type { ITCPClient } from "./interface.ts";

type TReturnPromise = void | Promise<void>;

export class BunTCPClient extends BaseTCPClient implements ITCPClient {
	private resolve: ((data: Buffer) => void) | null = null;
	private reject: ((data: Buffer) => void) | null = null;

	async connect(host: string, port: number): Promise<void> {
		this.socket = await connect({
			hostname: host,
			port,
			socket: {
				binaryType: "buffer",
				data: (socket: TCPSocket, data: Buffer) => this.handleData(data),
				error: (socket: TCPSocket, error: Error): TReturnPromise => {
					console.error(error);
					throw error;
				},
				connectError: (socket: TCPSocket, error): TReturnPromise => {
					console.error(error);
					throw error;
				},
			},
		});

		if (!this.socket) {
			throw new Error("Failed to connect");
		}
	}

	async send(command: string): Promise<Buffer> {
		if (!this.socket) {
			throw new Error("No active connection");
		}

		this.buffer = Buffer.alloc(0);

		return new Promise((resolve, reject) => {
			this.resolve = resolve;

			this.socket!.write(`${command.trim()}\r\n`);
		});
	}

	protected handleData(data: Buffer): void {
		this.buffer = Buffer.concat([this.buffer, data]);

		// Перевіряємо, чи отримано повну відповідь
		if (this.isCompleteResponse(this.buffer)) {
			const resolve = this.resolve;
			this.resolve = null;
			if (resolve) resolve(this.buffer);
		}
	}
}
