import ipServices, {
  getRandomizedServices,
  type ServiceName,
  type ServiceUrl,
} from "./ipServices.ts";
import { getProxyUrl, getRandomUsername } from "./proxy.ts";
import { proxyFetch } from "./fetch.ts";

import geoip, { type Lookup } from "geoip-lite";

export type IPInfo = {
  ip: string;
  serviceName?: ServiceName;
  serviceNameUrl?: ServiceUrl;
  proxy?: string;
  proxyUser?: string;
  rawResponse?: string;
};

export type GeoIPInfo = IPInfo & Partial<Lookup>;

async function getTextFromStream(readableStream) {
  let reader = readableStream.getReader();
  let utf8Decoder = new TextDecoder();
  let nextChunk;

  let resultStr = "";

  while (!(nextChunk = await reader.read()).done) {
    let partialData = nextChunk.value;
    resultStr += utf8Decoder.decode(partialData);
  }

  return resultStr;
}

export async function fetchIPInfo(
  serviceName: ServiceName,
  proxyUser: string = getRandomUsername(),
): Promise<GeoIPInfo> {
  return new Promise<GeoIPInfo>(async (resolve, reject) => {
    const url = ipServices[serviceName];

    const proxy = getProxyUrl(proxyUser);

    const data = await proxyFetch(url, {
      proxy,
      signal: AbortSignal.timeout(30000),
    })
      .then(async (response) => {
        const contentType = response.headers.get("content-type");

        return contentType?.includes("application/json")
          ? await response.json()
          : await response.text().then((string) => string.trim());
      })
      .catch((e) => {
        reject(e);
      });

    let ipInfo: IPInfo | null = null;

    const base: Partial<IPInfo> = {
      rawResponse: data,
      serviceName,
      serviceNameUrl: url,
      proxy,
      proxyUser,
    };

    switch (serviceName) {
      case "icanhazip.com":
      case "checkip.amazonaws.com":
      case "ident.me":
      // case "ifconfig.me":
      case "whatismyip.akamai.com":
      case "ipv4.text.wtfismyip.com":
      case "ipify.org":
        // case "ipify.org (IPv6)":

        ipInfo = {
          ip: data || data?.ip,
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

      case "wtfismyip.com":
      case "myip.wtf":
        ipInfo = {
          ip: data?.YourFuckingIPAddress || data?.ip,
          ...base,
        };
        break;
    }

    if (ipInfo.ip) {
      const geo = geoip.lookup(ipInfo.ip);

      ipInfo = {
        ...ipInfo,
        ...geo,
      };
    }

    if (!ipInfo) {
      reject(`Unsupported service: ${serviceName}`);
    }

    resolve(ipInfo);
  });
}

export async function getPublicIP(
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
