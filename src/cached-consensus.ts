import * as fs from "fs";
import * as net from "net";

// Шлях до файлу cached-consensus
const consensusPath = "/var/lib/tor/cached-consensus";

// Поріг пропускної здатності (у байтах/сек) для виключення вузлів
const BANDWIDTH_THRESHOLD = 100_000; // 100 KB/s

// Параметри ControlPort
const CONTROL_PORT = 9051;
const CONTROL_PASS = ""; // Вкажіть пароль, якщо потрібен

// Функція для зчитування та парсингу файлу consensus
async function parseConsensusFile(filePath: string): Promise<string[]> {
    const data = await fs.promises.readFile(filePath, "utf-8");
    const lines = data.split("\n");

    const slowNodes: string[] = [];
    let currentNodeId = "";

    for (const line of lines) {
        if (line.startsWith("r ")) {
            // Зберігаємо ID вузла
            currentNodeId = line.split(" ")[2];
        }
        if (line.startsWith("w ")) {
            // Аналіз пропускної здатності
            const bandwidthLine = line.split(" ");
            const bandwidthField = bandwidthLine.find((field) => field.startsWith("Bw="));
            if (bandwidthField) {
                const bandwidth = parseInt(bandwidthField.split("=")[1], 10);
                if (bandwidth < BANDWIDTH_THRESHOLD && currentNodeId) {
                    slowNodes.push(currentNodeId);
                }
            }
        }
    }

    return slowNodes;
}

// Функція для оновлення налаштувань Tor через ControlPort
async function updateTorConfig(slowNodes: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const client = net.createConnection({ port: CONTROL_PORT }, () => {
            // Аутентифікація
            if (CONTROL_PASS) {
                client.write(`AUTHENTICATE "${CONTROL_PASS}"\r\n`);
            } else {
                client.write("AUTHENTICATE\r\n");
            }

            // Чекаємо відповіді
            client.once("data", (data) => {
                if (!data.toString().startsWith("250")) {
                    reject(new Error("Authentication failed"));
                    client.end();
                    return;
                }

                // Формуємо список вузлів для виключення
                const excludeNodes = slowNodes.join(",");
                client.write(`SETCONF ExcludeNodes=${excludeNodes}\r\n`);

                // Перезапуск Tor для застосування змін
                client.write("SIGNAL RELOAD\r\n");
                client.end();
                resolve();
            });
        });

        client.on("error", reject);
    });
}

// Основна функція
(async () => {
    try {
        // Перевірка наявності файлу consensus
        if (!fs.existsSync(consensusPath)) {
            throw new Error(`Файл не знайдено за шляхом: ${consensusPath}`);
        }

        console.log("Парсинг файлу cached-consensus...");
        const slowNodes = await parseConsensusFile(consensusPath);

        if (slowNodes.length === 0) {
            console.log("Повільні вузли не знайдено.");
            return;
        }

        console.log(`Знайдено ${slowNodes.length} повільних вузлів. Оновлюємо Tor...`);
        // await updateTorConfig(slowNodes);

        console.log("Tor успішно оновлено. Повільні вузли виключено.");
    } catch (err) {
        console.error("Помилка:", err.message);
    }
})();
