import fetch from "@scraper/fetch";

import geoIp, { type Lookup } from "geoip-lite";
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
	proxyUser: string | undefined = getRandomUsername(),
): Promise<GeoIPInfo> {
	try {
		const serviceNameUrl = ipServices[serviceName];
		const proxy = getProxyUrl(proxyUser);

		const response = await fetch(serviceNameUrl, {
			proxy,
			referrer:
				"https://www.bing.com/search?pc=OA1&q=public%20IP%20checking%20services%20list",
			signal: AbortSignal.timeout(60000),
		});

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}

		const contentType = response.headers.get("content-type");
		const data = contentType?.includes("application/json")
			? await response.json()
			: (await response.text()).trim();

		const base: Partial<IPInfo> = {
			rawResponse: data,
			serviceName,
			serviceNameUrl,
			proxy,
			proxyUser,
		};

		let ipInfo: IPInfo | undefined;

		if (Object.hasOwn(oneLineServices, serviceName)) {
			ipInfo = { ip: data || data?.ip, ...base };
		} else {
			ipInfo = getServiceSpecificIPInfo(serviceName, data, base);
		}

		if (!ipInfo) {
			throw new Error(`Unsupported service: ${serviceName}`);
		}

		if (ipInfo.ip) {
			const geo = geoIp.lookup(ipInfo.ip);
			ipInfo = { ...ipInfo, ...geo };
		} else {
			throw new Error(`Failed to fetch IP for "${serviceName}"`);
		}

		return ipInfo as GeoIPInfo;
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

function getServiceSpecificIPInfo(
	serviceName: ServiceName,
	data: any,
	base: Partial<IPInfo>,
): IPInfo | undefined {
	switch (serviceName) {
		case "httpbin.org":
			return { ip: data?.origin, ...base };
		case "check.torproject.org":
			return { ip: data?.IP, ...base };
		case "api.my-ip.io/v2/ip.json":
			return { ip: data?.ip, ...base };
		case "ifconfig.pro":
			return { ip: (data as string).split(" - ")[0], ...base };
		case "wtfismyip.com":
		case "myip.wtf":
			return { ip: data?.YourFuckingIPAddress, ...base };
		default:
			return undefined;
	}
}

export default async function getPublicIP(
	proxyUser: string = getRandomUsername(),
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
