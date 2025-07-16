import { BunFetchHttpClient, BunHttpClient } from "@scraper/fetch";
import { Array as A, Data, Effect, Random, Schema } from "effect";
import geoIp from "geoip-lite";
import { getProxyUrl } from "./proxy";
import { IpInfoResponseUnion } from "./Schema";

export class GeoIpNotFoundError extends Data.TaggedError(
	"GeoIpNotFoundError",
) {}

export class IpServicesNotAvailableError extends Data.TaggedError(
	"IpServicesNotAvailableError",
) {}

export class IpServicesFailedError extends Data.TaggedError(
	"IpServicesFailedError",
) {}

export class IpIsUndefinedError extends Data.TaggedError("IpIsUndefinedError")<{
	response: unknown;
	url: string;
}> {}

export class IpInfoService extends Effect.Service<IpInfoService>()(
	"IpInfoService",
	{
		effect: Effect.gen(function* () {
			const client = (yield* BunHttpClient.HttpClient).pipe(
				BunHttpClient.filterStatusOk,
				BunHttpClient.followRedirects(2),
			);

			const lookup = (url: string, proxy: string) =>
				client
					.get(url, {
						proxy,
						verbose: true,
						headers: {
							"User-Agent": "curl/8.7.1",
						},
					})
					.pipe(
						Effect.timeout("5 second"),
						Effect.flatMap((response) =>
							Effect.gen(function* () {
								const isJson =
									response.headers["content-type"]?.includes(
										"application/json",
									) ?? false;

								const result = isJson
									? yield* response.json
									: { raw: (yield* response.text).trim() };

								const data =
									yield* Schema.decodeUnknown(IpInfoResponseUnion)(result);

								const ip = Object.values(data).at(0);

								if (!ip) {
									return yield* Effect.fail(
										new IpIsUndefinedError({
											response: result,
											url: response.request.url,
										}),
									);
								}

								const geoData = geoIp.lookup(ip);

								if (geoData === null) {
									return yield* Effect.fail(new GeoIpNotFoundError());
								}

								return { ...geoData, ip, proxy };
							}),
						),
					);

			const getIpData = (proxy: string = getProxyUrl()) =>
				Effect.gen(function* () {
					const ipProviders = yield* Random.shuffle([
						"https://wtfismyip.com/text",
						"https://myip.wtf/text",
						"https://api.my-ip.io/v2/ip.json",
						"https://check.torproject.org/api/ip",
						"https://httpbin.org/ip",
						"https://ifconfig.pro/ip.host",
						"https://iphorse.com/json",
						"https://ipapi.co/json",
						"https://api.ip2location.io",
						"https://ifconfig.co",
						"https://ipaddr.site",
						"https://checkip.amazonaws.com",
						"https://ident.me",
						"https://whatismyip.akamai.com",
						"https://ipv4.text.wtfismyip.com",
						"https://api.ipify.org",
						"https://l2.io/ip",
						"https://curlmyip.net",
						"https://ifconfig.io/ip",
						"https://ifconfig.es",
						"https://ipaddress.sh",
						"https://eth0.me",
						"https://icanhazip.com",
						"https://ip.liquidweb.com",
						//  "https://ipaddy.net",
					]);

					return yield* Effect.firstSuccessOf(
						A.fromIterable(ipProviders).map((service) =>
							lookup(service, proxy),
						),
					).pipe(
						Effect.catchAll(() =>
							Effect.fail(new IpServicesNotAvailableError()),
						),
					);
				});

			return { getIpData } as const;
		}),
		dependencies: [BunFetchHttpClient.layer],
		accessors: true,
	},
) {}
