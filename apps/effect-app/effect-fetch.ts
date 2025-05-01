import crypto from "node:crypto";
import { Effect, pipe } from "effect";
import geoIp, { type Lookup } from "geoip-lite";

export const oneLineServices = {
	"ipaddr.site": "https://ipaddr.site",
	"checkip.amazonaws.com": "https://checkip.amazonaws.com",
	"ident.me": "https://ident.me",
	"whatismyip.akamai.com": "https://whatismyip.akamai.com",
	"ipv4.text.wtfismyip.com": "https://ipv4.text.wtfismyip.com",
	"ipify.org": "https://api.ipify.org",
	"l2.io": "https://l2.io/ip",
	// "ipaddy.net": "https://ipaddy.net",
	"curlmyip.net": "https://curlmyip.net",
	"ifconfig.io/ip": "https://ifconfig.io/ip",
	"ifconfig.es": "https://ifconfig.es",
	"ipaddress.sh": "https://ipaddress.sh",
} as const;

const ipServices = {
	"wtfismyip.com": "https://wtfismyip.com/json",
	"myip.wtf": "https://myip.wtf/json",
	"api.my-ip.io/v2/ip.json": "https://api.my-ip.io/v2/ip.json",
	"check.torproject.org": "https://check.torproject.org/api/ip",
	"httpbin.org": "https://httpbin.org/ip",
	"ifconfig.pro": "https://ifconfig.pro/ip.host",
	...oneLineServices,
} as const;

export type ServiceName = keyof typeof ipServices;

export type ServiceUrl = (typeof ipServices)[keyof typeof ipServices];

// ===== Types =====
export type IPInfo = {
	ip: string;
	serviceName?: ServiceName;
	serviceNameUrl?: ServiceUrl;
	proxy?: string;
	proxyUser?: string;
	rawResponse?: string | object;
};

function getRandomizedServices() {
	// const services = Object.keys(ipServices) as ServiceName[];
	// return services.sort(() => Math.random() - 0.5); // Випадковий порядок
	//
	return pipe(
		// Get the array of service names
		Effect.sync(() => Object.keys(ipServices) as ServiceName[]),

		// Shuffle the array using Effect's pure approach
		Effect.flatMap((services) =>
			pipe(
				Effect.sync(() => [...services]), // Create a copy to avoid mutating the original
				Effect.map((mutableServices) => {
					// Fisher-Yates shuffle algorithm
					for (let i = mutableServices.length - 1; i > 0; i--) {
						const j = Math.floor(Math.random() * (i + 1));
						[mutableServices[i], mutableServices[j]] = [
							mutableServices[j],
							mutableServices[i],
						];
					}
					return mutableServices as readonly ServiceName[];
				}),
			),
		),
	);
}

export const getRandomUsername = (): string => `x${crypto.randomUUID()}x`;

export const getProxyUrl = (username: string = getRandomUsername()) =>
	`http://${username}:pass@127.0.0.1:8118`;

type GeoIPInfo = IPInfo & Partial<Lookup>;

// ===== Error types =====
export class HTTPError extends Error {
	readonly _tag = "HTTPError";
	constructor(public status: number) {
		super(`HTTP error: ${status}`);
	}
}

export class UnsupportedServiceError extends Error {
	readonly _tag = "UnsupportedServiceError";
	constructor(public service: ServiceName) {
		super(`Unsupported service: ${service}`);
	}
}

export class IPFetchError extends Error {
	readonly _tag = "IPFetchError";
	constructor(public service: ServiceName) {
		super(`Failed to fetch IP for "${service}"`);
	}
}

export class AllServicesUnavailableError extends Error {
	readonly _tag = "AllServicesUnavailableError";
	constructor() {
		super("All IP services are unavailable.");
	}
}

// ===== Utility Functions =====

/**
 * Converts any error to an Effect error
 */
const toEffectError = (error: unknown): Error =>
	error instanceof Error ? error : new Error(String(error));

/**
 * Extracts IP information from service response based on service type
 */
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

// ===== Core Effects =====

/**
 * Creates an Effect that fetches IP information from a specified service
 */
export const fetchIPInfo = (
	serviceName: ServiceName,
	proxyUserParam?: string,
): Effect.Effect<GeoIPInfo, Error, never> => {
	return pipe(
		// Get or generate proxy user
		Effect.sync(() => proxyUserParam ?? getRandomUsername()),

		// Create proxy URL and prepare fetch
		Effect.flatMap((proxyUser) => {
			const serviceNameUrl = ipServices[serviceName];

			return pipe(
				Effect.sync(() => getProxyUrl(proxyUser)),
				Effect.flatMap((proxy) => {
					// Perform the fetch operation
					return Effect.tryPromise({
						try: () =>
							fetch(serviceNameUrl, {
								proxy,
								referrer:
									"https://www.bing.com/search?pc=OA1&q=public%20IP%20checking%20services%20list",
								signal: AbortSignal.timeout(60000),
							}),
						catch: toEffectError,
					}).pipe(
						// Handle response
						Effect.flatMap((response) => {
							if (!response.ok) {
								return Effect.fail(new HTTPError(response.status));
							}

							const contentType = response.headers.get("content-type");
							const isJson = contentType?.includes("application/json");

							return Effect.tryPromise({
								try: () =>
									isJson
										? response.json()
										: response.text().then((text) => text.trim()),
								catch: toEffectError,
							}).pipe(
								Effect.map((data) => {
									const base: Partial<IPInfo> = {
										rawResponse: data,
										serviceName,
										serviceNameUrl,
										proxy,
										proxyUser,
									};

									let ipInfo: IPInfo | undefined;

									// Extract IP based on service type
									if (
										Object.prototype.hasOwnProperty.call(
											oneLineServices,
											serviceName,
										)
									) {
										ipInfo = {
											ip: typeof data === "string" ? data : (data as any)?.ip,
											...base,
										};
									} else {
										ipInfo = getServiceSpecificIPInfo(serviceName, data, base);
									}

									if (!ipInfo) {
										throw new UnsupportedServiceError(serviceName);
									}

									if (!ipInfo.ip) {
										throw new IPFetchError(serviceName);
									}

									// Add geo information
									const geo = geoIp.lookup(ipInfo.ip);
									return { ...ipInfo, ...geo } as GeoIPInfo;
								}),
							);
						}),
					);
				}),
			);
		}),

		// Handle any errors
		Effect.catchAll((error) => Effect.fail(toEffectError(error))),
	);
};

/**
 * Creates an Effect that tries multiple services to get public IP information
 */
export const getPublicIP = (
	proxyUser?: string,
): Effect.Effect<GeoIPInfo, Error, never> => {
	const proxyUserEffect = proxyUser
		? Effect.succeed(proxyUser)
		: Effect.sync(() => getRandomUsername());

	return pipe(
		proxyUserEffect,
		Effect.flatMap((user) => {
			const services = getRandomizedServices();

			// Create an effect for each service
			const serviceEffects = services.map((service) =>
				fetchIPInfo(service, user).pipe(
					Effect.catchAll((error) => {
						// Log the error but don't fail yet
						return Effect.sync(() => {
							console.error(`Error with service ${service}:`, error);
							// Return a "marked" effect that we know failed
							return null as unknown as GeoIPInfo;
						}).pipe(Effect.flatMap(() => Effect.fail(error)));
					}),
				),
			);

			// Try each service in sequence until one succeeds
			return pipe(
				serviceEffects.reduce(
					(acc, curr) => acc.pipe(Effect.catchAll(() => curr)),
					Effect.fail(new AllServicesUnavailableError()) as Effect.Effect<
						never,
						AllServicesUnavailableError,
						GeoIPInfo
					>,
				),
			);
		}),
	);
};
