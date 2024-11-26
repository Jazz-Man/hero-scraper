import {TorClient} from "./client.ts";
import {BunTCPClient} from "./bun.ts";
import Parser from "./lib/Parser.ts";

const tcpClient = new BunTCPClient();


try {

  const torClient = new TorClient(tcpClient);

  await torClient.connect("127.0.0.1", 9051);
   await torClient.authenticate("jazzman.sv1");

  const parser = new Parser();

  // const cmd = "desc/all-recent";
  const cmd = TorClient.GETINFO_DESCRIPTOR_ID('81C55D403A82BF6E7C3FBDBD41D102B7088900D9');
  // const cmd = TorClient.GETINFO_ADDRESS;

  // const response = await torClient.getInfoAddress();
  // const response = await torClient.getInfo(cmd);
  // const response = await torClient.getInfo('desc/id/81C55D403A82BF6E7C3FBDBD41D102B7088900D9');
  // const response = await torClient.getProtocolInfo();
  const response = await torClient.getInfo(TorClient.GETINFO_NETSTATUS_ALL);
  // const response = await torClient.getInfoDescriptor('81C55D403A82BF6E7C3FBDBD41D102B7088900D9');
  //

  const res = parser.parseRouterStatus(response)
  console.log(res);

  torClient.close();
} catch (error) {
  console.error("Error:", error);
} finally {
  tcpClient.close();
}

