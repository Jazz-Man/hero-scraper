import geoIp, { type Lookup } from "geoip-lite";
import fetch from "@scraper/fetch";
import ipServices, {
    getRandomizedServices,
    oneLineServices,
    type ServiceName,
    type ServiceUrl,
} from "./src/ipServices";
import { getProxyUrl, getRandomUsername } from "./src/proxy";

export type IPInfo = {
  ip: string;
  serviceName?: ServiceName;
  serviceNameUrl?: ServiceUrl;
  proxy?: string;
  proxyUser?: string;
  rawResponse?: string | object;
};

export type GeoIPInfo = IPInfo & Partial<Lookup>;

export async function fetchIPInfo(
  serviceName: ServiceName,
  proxyUser: string = getRandomUsername(),
): Promise<GeoIPInfo> {
  return new Promise<GeoIPInfo>(async (resolve, reject) => {
    const serviceNameUrl = ipServices[serviceName];

    const proxy = getProxyUrl(proxyUser);

    const data = await fetch(serviceNameUrl, {
      proxy,
      referrer:
        "https://www.bing.com/search?pc=OA1&q=public%20IP%20checking%20services%20list",
      signal: AbortSignal.timeout(30000),
      // verbose: false,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");

        try {
          return contentType?.includes("application/json")
            ? await response.json()
            : await response.text().then((string) => string.trim());
        } catch (error) {
          throw new Error(`Failed to parse response: ${error.message}`);
        }
      })
      .catch((e) => {
        reject(e);
      });

    let ipInfo: IPInfo | null = null;

    const base: Partial<IPInfo> = {
      rawResponse: data,
      serviceName,
      serviceNameUrl,
      proxy,
      proxyUser,
    };

    if (oneLineServices.hasOwnProperty(serviceName)) {
      ipInfo = {
        ip: data || data?.ip,
        ...base,
      };
    } else {
      switch (serviceName) {
        case "httpbin.org":
          ipInfo = {
            ip: data?.origin,
            ...base,
          };
          break;
        case "check.torproject.org":
          ipInfo = {
            ip: data?.IP,
            ...base,
          };
          break;

        case "api.my-ip.io/v2/ip.json":
          ipInfo = {
            ip: data?.ip,
            ...base,
          };
          break;
        case "ifconfig.pro":
          ipInfo = {
            ip: (data as string).split(" - ").at(0),
            ...base,
          };

          break;

        case "wtfismyip.com":
        case "myip.wtf":
          ipInfo = {
            ip: data?.YourFuckingIPAddress,
            ...base,
          };
          break;
      }
    }

    if (ipInfo.ip) {
      const geo = geoIp.lookup(ipInfo.ip);

      ipInfo = {
        ...ipInfo,
        ...geo,
      };
    } else {
      reject(`Failed to fetch IP for "${serviceName}"`);
    }

    if (!ipInfo) {
      reject(`Unsupported service: ${serviceName}`);
    }

    resolve(ipInfo);
  });
}

export default async function getPublicIP(
  proxyUser: string | null = getRandomUsername(),
): Promise<GeoIPInfo> {
  const services = getRandomizedServices();
  for (const service of services) {
    try {
      return await fetchIPInfo(service, proxyUser);
    } catch (error) {
      console.error(`Error with service ${service}:`, error);
    }
  }
  throw new Error("All IP services are unavailable.");
}
