import { TorClient } from "./client.ts";
import { BunTCPClient } from "./bun.ts";
import Parser from "./lib/Parser.ts";
import { NodeTCPClient } from "./node.ts";

const tcpClient = new NodeTCPClient();

const MINIMUM_BANDWIDTH_KB = 1024 * 1_000; // 1 MB/s у кілобайтах

try {
  const torClient = new TorClient(tcpClient);

  await torClient.connect("127.0.0.1", 9051);
  await torClient.authenticate("jazzman.sv1");

  const parser = new Parser();

  const response = await torClient.getInfoDirectoryStatus();

  const slowNodes: string[] = [];

  response.forEach((router, key) => {
    const bandwidth = parseInt(router.bandwidth, 10); // Пропускна здатність у KB/s

    const addToSlow =
      bandwidth < MINIMUM_BANDWIDTH_KB || !router.flags?.includes("Fast");

    if (addToSlow) {

      slowNodes.push(`$${router.fingerprint}`);
    }
  });

  // const res = parser.parseMicrodescriptorStatus(response);
  //

  // if (slowNodes.length) {
  //   const excludeNodes = slowNodes.join(",");
  //   const setExcludeNodes = await torClient.sendCommand(
  //     `SETCONF ExcludeNodes=${excludeNodes}`,
  //   );
  //
  //   const signal = await torClient.sendCommand("SIGNAL RELOAD");
  //   console.log(setExcludeNodes.toString());
  //   console.log(signal.toString());
  //
  //
  //   const conf = await torClient.getConf("ExcludeNodes");
  //
  //   console.log(conf)
  // }

  console.log(slowNodes.length)

  torClient.close();
} catch (error) {
  console.error("Error:", error);
} finally {
  tcpClient.close();
}
