import {TorClient} from "./client.ts";
import {BunTCPClient} from "./bun.ts";
import Parser from "./lib/Parser.ts";

const tcpClient = new BunTCPClient();


try {

  const torClient = new TorClient(tcpClient);

  await torClient.connect("127.0.0.1", 9051);
   await torClient.authenticate("jazzman.sv1");

  const parser = new Parser();

  const response = await torClient.getInfoStatusVersionRecommended(
      // 'config/defaults'
  );

  // const res = parser.parseMicrodescriptorStatus(response);
  //
  console.log(response);

  torClient.close();
} catch (error) {
  console.error("Error:", error);
} finally {
  tcpClient.close();
}

