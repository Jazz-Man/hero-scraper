import {connect, type TCPSocket} from "bun";
import type {ITCPClient} from "./interface.ts";
import BaseTCPClient from "./base.ts";


type TReturnPromise = void | Promise<void>;

interface BunTCPClientOptions {
  onOpen?: (socket: TCPSocket) => TReturnPromise;
  onError?: (socket: TCPSocket, error: Error) => TReturnPromise;
  onClose?: (socket: TCPSocket) => TReturnPromise;
  onTimeout?: (socket: TCPSocket) => TReturnPromise;
}

export class BunTCPClient extends BaseTCPClient implements ITCPClient {
  private connection: TCPSocket | null = null;
  private options: BunTCPClientOptions;

  constructor(options: BunTCPClientOptions = {}) {
    super();
    this.options = options;
  }

  async connect(host: string, port: number): Promise<void> {
    this.connection = await connect({
      hostname: host,
      port,
      socket: {
        open: (socket: TCPSocket): TReturnPromise => {
          if (this.options.onOpen) this.options.onOpen(socket);
        },
        data: (socket: TCPSocket, data: Buffer) => this.handleData(data),
        close: (socket): TReturnPromise => {
          if (this.options.onClose) this.options.onClose(socket);
        },
        error: (socket: TCPSocket, error: Error): TReturnPromise => {
          if (this.options.onError) this.options.onError(socket, error);
        },
        connectError: (socket: TCPSocket, error): TReturnPromise => {
          throw new Error("Connection failed: " + error);
        },
        timeout(socket: TCPSocket): TReturnPromise {
          if (this.options.onTimeout) this.options.onTimeout(socket);
        },
      },
    });

    if (!this.connection) {
      throw new Error("Failed to connect");
    }
  }

  async send(data: string): Promise<void> {
    if (this.connection) {
      this.connection.flush();
      this.connection.write(data);
    }
  }


  async close(): Promise<void> {
    if (this.connection) {
      this.connection.end();
      this.connection = null;
    }
  }
}
