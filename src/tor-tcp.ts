import Tor from "./lib/tor.ts";

import geoip from "geoip-lite";

const tor = new Tor({
  host: "localhost",
  port: 9051,
  password: "jazzman.sv1",
});

await tor.connect(); // connect tor client

// await tor.signalNewnym(); // change tor ip


const curlIp = "185.220.101.4";

// let response = await tor.getInfo("traffic/read"); // get config file
// let response = await tor.getInfo("info/names"); // get config file
// let response = await tor.getInfo("status/bootstrap-phase-test"); // get config file
// let response = await tor.getInfo("status/bootstrap-phase"); // get config file
let response = await tor.getInfo("circuit-status"); // get config file

function parseCircuitStatus(circuitStatus: string) {
  const circuits = [];

  // Розбиваємо дані на рядки
  const lines = circuitStatus.split("\n");

  lines.forEach((line) => {
    // Пропускаємо службові рядки
    if (!/^\d+\s/.test(line)) return;

    // Оновлений регулярний вираз
    const match = line.match(
      /^(\d+)\s+(\w+)\s+((?:\$\w+~[^\s,]+,?)+)\s+BUILD_FLAGS=([\w,]+)\s+PURPOSE=([\w_]+)\s+TIME_CREATED=([\d\-T:.]+)/,
    );

    if (match) {
      const [_, circuitId, status, nodes, buildFlags, purpose, timeCreated] =
        match;

      // Розбиваємо вузли на окремі об'єкти
      const nodeList = nodes.split(",").map((node) => {
        const [id, nickname] = node.split("~");
        return { id, nickname };
      });

      const exitNode = nodeList[nodeList.length - 1];

      circuits.push({
        circuitId: parseInt(circuitId),
        status,
        nodes: nodeList,
        buildFlags: buildFlags.split(","),
        exitNode,
        purpose,
        timeCreated,
      });
    } else {
      // console.log("Не вдалося розібрати рядок:", line);
    }
  });

  return circuits;
}

const circuits = [];

let dataArray = response.message
    .split(/\r?\n/)
    .filter((line) =>
        line.trim() &&
        line !== ".");

// dataArray
//   .filter((line) => !line.includes("250 OK"))
//   .forEach((line) => {
//
//     const match = line.match(
//         /^(\d+)\s+(\w+)\s+((?:\$\w+~[^\s,]+,?)+)\s+BUILD_FLAGS=([\w,]+)\s+PURPOSE=([\w_]+)\s+TIME_CREATED=([\d\-T:.]+)/,
//     );
//
//     if (match) {
//       const [_, circuitId, status, nodes, buildFlags, purpose, timeCreated] =
//           match;
//
//       const nodeList = nodes.split(",").map((node) => {
//         const [id, nickname] = node.split("~");
//         return { id, nickname };
//       });
//
//       const exitNode = nodeList[nodeList.length - 1];
//
//       circuits.push({
//         circuitId: parseInt(circuitId),
//         status,
//         nodes: nodeList,
//         buildFlags: buildFlags.split(","),
//         exitNode,
//         purpose,
//         timeCreated,
//       });
//     }
//
//   });




// const exitNodes = circuits[circuits.length - 1];
//
//
// const nsResponse = await tor.getInfo(`ns/id/${exitNodes.exitNode.id}`);
//
// const ipMatch = nsResponse.data.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
//
// const exitNodeIP = ipMatch ? ipMatch[0] : null;
//
//
// const geo = geoip.lookup(exitNodeIP);

// if (dataArray.length === 1){
//
//   dataArray = dataArray.join(' ').split(/[0-9]{1,3}[-+][\w\/-]+=/).filter(line => line.trim())
//
// }
//

console.log(dataArray);

await tor.quit(); // disconnect tor client
