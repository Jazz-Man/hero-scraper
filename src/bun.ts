import { connect } from 'bun';
import { tlsConnect } from 'bun';

type IPData = {
  YourFuckingIPAddress: string;
  YourFuckingCountry: string;
  YourFuckingCity: string;
  YourFuckingRegion: string;
  YourFuckingLatitude: string;
  YourFuckingLongitude: string;
  YourFuckingTimezone: string;
};

async function fetchIpThroughTor(): Promise<IPData> {
  const proxyHost = "127.0.0.1"; // SOCKS5 проксі Tor
  const proxyPort = 9050;
  const targetHost = "wtfismyip.com";
  const targetPath = "/json";
  const targetPort = 443;

  // Генерація рандомного імені користувача
  const randomUsername = `x${Math.floor(Math.random() * 100000)}x`;
  const socksRequest = Buffer.from([
    0x05, // SOCKS5 версія
    0x01, // Кількість методів автентифікації
    0x02, // Метод: ім'я користувача/пароль
  ]);

  const socket = await Bun.connect({ hostname: proxyHost, port: proxyPort });

  socket.write(socksRequest);

  const data = await socket.read();

  if (data[0] === 0x05 && data[1] === 0x02) {
    const username = Buffer.from(randomUsername);
    const password = Buffer.from(""); // Пароль порожній
    const authRequest = Buffer.concat([
      Buffer.from([0x01, username.length]),
      username,
      Buffer.from([password.length]),
      password,
    ]);
    socket.write(authRequest);

    const authData = await socket.read();
    if (authData[0] === 0x01) {
      const request = Buffer.concat([
        Buffer.from([0x05, 0x01, 0x00, 0x03]),
        Buffer.from([targetHost.length]),
        Buffer.from(targetHost),
        Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
      ]);
      socket.write(request);

      const connectionData = await socket.read();
      if (connectionData[1] === 0x00) {
        // Переключаємося на TLS
        const tlsSocket = await tlsConnect({
          socket,
          servername: targetHost,
        });

        const httpsRequest =
            `GET ${targetPath} HTTP/1.1\r\n` +
            `Host: ${targetHost}\r\n` +
            `Connection: close\r\n\r\n`;

        tlsSocket.write(httpsRequest);

        const response = await tlsSocket.read();
        const responseString = response.toString();
        const [, body] = responseString.split("\r\n\r\n");

        try {
          return JSON.parse(body) as IPData;
        } catch (e) {
          throw new Error("Error parsing response");
        }
      }
    }
  }

  throw new Error("Failed to fetch IP through Tor");
}

const ipData = await fetchIpThroughTor();
console.log(ipData);
