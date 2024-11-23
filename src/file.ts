// import * as os from "node:os";
//
// const home = os.homedir();
//
async function* readLines(filePath: string) {
  const reader = Bun.file(filePath)
    .stream()
    .pipeThrough(new TextDecoderStream("utf-8"))
    .getReader();

  let remainder = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    let lines = (remainder + value).split(/\r?\n/);
    remainder = lines.pop()!;

    for (const line of lines) {
      yield line;
    }
  }

  if (remainder) {
    yield remainder;
  }
}
//
// let currentNodeId: string | undefined = undefined;
//
// const MIN_BANDWIDTH = 1024; // Мінімальна швидкість у байтах (600 КБ/с)
//
// const slowNodes: string[] = [];
//
// for await (const line of readLines(`${home}/.tor/cached-consensus`)) {
//   if (line.startsWith("r ")) {
//     // Зберігаємо ID вузла (3-й елемент після розділення пробілами)
//     currentNodeId = line.split(" ")[2];
//   }
//
//   if (line.startsWith("w ") && currentNodeId) {
//
//     console.log(line);
//     const bandwidthMatch = line.match(/Bandwidth=(\d+)/);
//     if (bandwidthMatch) {
//       const bandwidth = parseInt(bandwidthMatch[1], 10);
//       if (bandwidth < MIN_BANDWIDTH) {
//         slowNodes.push(`$${currentNodeId}`);
//       }
//     }
//     currentNodeId = undefined;
//   }
// }
// console.log(slowNodes.length);



import net from "net";

const TOR_CONTROL_HOST = "127.0.0.1";
const TOR_CONTROL_PORT = 9051;
const TOR_CONTROL_PASSWORD = "jazzman.sv1"; // замініть на свій пароль

const MINIMUM_BANDWIDTH_KB = 1024 * 1_000; // 1 MB/s у кілобайтах

async function sendTorCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(TOR_CONTROL_PORT, TOR_CONTROL_HOST, () => {
      socket.write(`${command}\r\n`);
    });

    let response = "";

    socket.on("data", (data) => {
      response += data.toString();
    });

    socket.on("end", () => {
      resolve(response);
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

async function authenticate(): Promise<void> {
  const response = await sendTorCommand(`AUTHENTICATE "${TOR_CONTROL_PASSWORD}"`);
  if (!response.includes("250 OK")) {
    throw new Error("Authentication failed!");
  }
}

async function getNodes(): Promise<string[]> {
  const response = await sendTorCommand("GETINFO ns/all");
  if (!response.includes("250+ns/all=")) {
    throw new Error("Failed to retrieve nodes list");
  }

  // Витягуємо вузли з відповіді
  const nodesData = response.split("\r\n").slice(1, -2);
  return nodesData;
}

function parseSlowNodes(nodes: string[]): string[] {
  const slowNodes: string[] = [];
  nodes.forEach((line) => {
    if (line.startsWith("r ")) {
      const [_, , fingerprint, , bandwidthStr] = line.split(" ");
      const bandwidth = parseInt(bandwidthStr, 10); // Пропускна здатність у KB/s
      if (bandwidth < MINIMUM_BANDWIDTH_KB) {
        slowNodes.push(`$${fingerprint}`);
      }
    }
  });
  return slowNodes;
}

async function setExcludedNodes(slowNodes: string[]): Promise<void> {
  const excludeNodesLine = `SETCONF ExcludeNodes=${slowNodes.join(",")}`;
  const response = await sendTorCommand(excludeNodesLine);
  if (!response.includes("250 OK")) {
    throw new Error("Failed to set ExcludeNodes");
  }
}

async function main() {
  try {
    console.log("Authenticating...");
    await authenticate();

    console.log("Fetching nodes...");
    const nodes = await getNodes();

    console.log("Parsing slow nodes...");
    const slowNodes = parseSlowNodes(nodes);

    if (slowNodes.length > 0) {
      console.log(`Excluding ${slowNodes.length} slow nodes...`);
      // await setExcludedNodes(slowNodes);
      console.log("Slow nodes excluded successfully!");
    } else {
      console.log("No slow nodes to exclude!");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

await main();
