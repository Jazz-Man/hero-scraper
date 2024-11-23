import { BunTCPClient } from "./bun.ts";
import { TorClient } from "./client.ts";
import { NodeTCPClient } from "./node.ts";
import type { TCPSocket } from "bun";
import { Socket } from "net";
import { Readable } from "stream";
import readline from "node:readline";
import ProtocolReply from "./lib/ProtocolReply.ts";
import Parser from "./lib/Parser.ts";

(async () => {
  const tcpClient = new BunTCPClient({});
  const torClient = new TorClient(tcpClient);

  const parser = new Parser();

  try {
    await torClient.connect("127.0.0.1", 9051);
    await torClient.authenticate("jazzman.sv1");

    const cmd = "desc/all-recent";
    // const cmd = "desc/name/InMemoryOfJohnKerr";

    const response = await torClient.sendCommand(`GETINFO ${cmd}`);

    const reply = await torClient.handleResponse(response, cmd);

    const res = parser.parseDirectoryStatus(reply);

    console.log(res);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await torClient.close();
  }
})();
