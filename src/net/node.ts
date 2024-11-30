import { Socket } from "net";
import BaseTCPClient from "./base.ts";
import type { ITCPClient } from "./interface.ts";

export class NodeTCPClient extends BaseTCPClient implements ITCPClient {
  declare protected socket: Socket;

  constructor() {
    super();
    this.socket = new Socket();

    this.socket.on("error", (error) => {
      throw error;
    });
  }

  async connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect(port, host, () => resolve());
      this.socket.once("error", (err) => reject(err));
    });
  }

  async send(command: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.buffer = Buffer.alloc(0);

      const handleData = (data: Buffer) => {
        this.buffer = Buffer.concat([this.buffer, data]);

        if (this.isCompleteResponse(this.buffer)) {
          this.socket.off("data", handleData); // Відключаємо обробник
          resolve(this.buffer);
        }
      };

      const errorHandler = (error: Error) => {
        this.socket.off("data", handleData); // Відключаємо обробник
        reject(error);
      };

      this.socket.on("data", handleData);

      this.socket.on("error", errorHandler);

      this.socket.write(`${command.trim()}\r\n`, (err) => {
        if (err) {
          this.socket.off("data", handleData); // Відключаємо обробник у разі помилки
          reject(err);
        }
      });
    });
  }
}
