import { fetch } from "bun";
import ipServices, {
  getRandomizedServices,
  type ServiceName,
} from "./ipServices.ts";
import { getProxyUrl, getRandomUsername } from "./proxy.ts";
import { HeaderGenerator } from "header-generator";

const headerGenerator = new HeaderGenerator({
  httpVersion: "2",
  browsers: ["chrome"],
  operatingSystems: ["macos"],
  devices: ["desktop"],
  locales: ["en-US"],
});

const headers = new Headers();

const allHeaders = headerGenerator.getHeaders();

Object.entries(allHeaders).map(([header, value]) => {
  headers.set(header, value);
});

type IPInfo = {
  ip: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  isp?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  hostname?: string;
  torExit?: boolean;
  serviceName?: ServiceName;
  proxyUser?: string;
  rawResponse?: string;
};

export async function fetchIPInfo(
  serviceName: ServiceName,
  proxyUser: string,
): Promise<IPInfo> {
  const url = ipServices[serviceName];

  const options: FetchRequestInit = {
    referrer:
      "https://www.bing.com/search?pc=OA1&q=public%20IP%20checking%20services%20list",
    proxy: getProxyUrl(proxyUser),
    verbose: true,
    tls: {
      rejectUnauthorized: false,
    },
    headers,
    // headers: allHeaders
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Failed to fetch from ${serviceName}`);
  }

  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  switch (serviceName) {
    case "icanhazip.com":
    case "checkip.amazonaws.com":
    case "ident.me":
    case "ifconfig.me":
    case "whatismyip.akamai.com":
    case "ipinfo.io/ip":
    case "ipecho.net/plain":
    case "ipv4.text.wtfismyip.com":
    case "ipify.org":
    case "ipify.org (IPv6)":
      return {
        ip: data.trim() || data.ip, // Універсальний доступ до IP
        rawResponse: data,
        serviceName, // Назва сервісу
        proxyUser,
      };
    case "check.torproject.org":
      return {
        ip: data.IP,
        rawResponse: data,
        serviceName, // Назва сервісу
        proxyUser,
      };

    case "wtfismyip.com":
    case "myip.wtf":
      return {
        ip: data.YourFuckingIPAddress || data.ip,
        country: data.YourFuckingCountry || data.country,
        countryCode: data.YourFuckingCountryCode,
        hostname: data.YourFuckingHostname,
        torExit: data.YourFuckingTorExit,
        rawResponse: data,
        serviceName, // Назва сервісу
        proxyUser,
      };

    default:
      throw new Error(`Unsupported service: ${serviceName}`);
  }
}

async function getPublicIP(proxyUser: string|null): Promise<IPInfo> {
  const services = getRandomizedServices();
  for (const service of services) {
    // console.log(`Trying service: ${service}`);
    try {
      const ipInfo = await fetchIPInfo(service, getRandomUsername());
      // console.log(`Successfully fetched from ${service}`);
      return ipInfo;
    } catch (error) {
      console.error(`Error with service ${service}:`, error);
    }
  }
  throw new Error("All IP services are unavailable.");
}

const promises = [];

for (let i = 0; i <= 500; i++) {
  promises.push(getPublicIP(null));
}

// const res = await getPublicIP(getRandomUsername());
// //
// console.log(res);
// console.log(allHeaders);
// console.log(headers);

await Promise.allSettled(promises)
  .then((results) => results.forEach((result) => console.log("result", result)))
  .catch((e) => console.error("error", e));
