import { Socket } from "net";
import type { TCPSocket } from "bun";

export default abstract class BaseTCPClient {
  protected buffer: Buffer = Buffer.alloc(0);

  protected socket: Socket | TCPSocket | null = null;

  abstract send(command: string): Promise<Buffer>;

  protected isCompleteResponse(buffer: Buffer): boolean {
    const markers: Buffer[] = [
      Buffer.from("250 OK\r\n"),
      Buffer.from("\r\n.\r\n"),
      Buffer.from("\r\n"),
    ];

    for (const marker of markers) {
      if (buffer.length >= marker.length && buffer.subarray(-marker.length).equals(marker)) {
        return true;
      }
    }


    // Перевірка на помилкову відповідь на основі коду помилки (початок з "5xx" або "6xx")
    const errorResponsePattern = /^[5]\d{2} /; // Шаблон для кодів помилок "5xx"

    const responseString = buffer.toString("utf8");
    if (errorResponsePattern.test(responseString)) {
      return true;
    }

    // Для асинхронних відповідей "6xx", наприклад "650"
    const asyncResponsePattern = /^6\d{2} /;  // Шаблон для асинхронних відповідей "6xx"
    return asyncResponsePattern.test(responseString);

  }



  close(): void {
    if (this.socket) {

      this.socket.write("QUIT\r\n");
      this.socket?.end();
      this.socket = null;
    }
  }
}
