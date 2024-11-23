import { Socket } from "net";
import type { ITCPClient } from "./interface.ts";
import BaseTCPClient from "./base.ts";

interface NodeTCPClientOptions {
  onConnect?: (socket: Socket) => void; // Кастомний обробник для події підключення
  onError?: (error: Error) => void; // Кастомний обробник для помилок
  onClose?: (socket: Socket) => void; // Кастомний обробник для закриття з'єднання
}

export class NodeTCPClient extends BaseTCPClient implements ITCPClient {
  private socket: Socket;
  private options: NodeTCPClientOptions;

  constructor(options: NodeTCPClientOptions = {}) {
    super();
    this.options = options;
    this.socket = new Socket();

    this.socket.on("connect", () => this.handleConnect());
    this.socket.on("data", (data) => this.handleData(data));
    this.socket.on("error", (err) => this.handleError(err));
    this.socket.on("close", () => this.handleClose());
  }

  async connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect(port, host, () => {
        resolve();
      });
      this.socket.once("error", (err) => reject(err));
    });
  }

  async send(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.write(data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close(): Promise<void> {
    this.socket.end();
    this.socket.destroy();
  }

  setTimeout(timeout: number): void {
    this.socket.setTimeout(timeout);
  }

  private handleConnect(): void {
    if (this.options.onConnect) this.options.onConnect(this.socket);
  }

  private handleError(err: Error): void {
    if (this.options.onError) this.options.onError(err);
  }

  private handleClose(): void {
    if (this.options.onClose) this.options.onClose(this.socket);
  }
}
