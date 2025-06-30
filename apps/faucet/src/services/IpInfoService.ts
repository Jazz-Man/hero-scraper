import { Array as A, Effect, Random, Schema } from "effect";
import geoIp, { type Lookup } from "geoip-lite";
import {
	GeoIpNotFoundError,
	IpIsUndefinedError,
	IpServicesNotAvailableError,
} from "../errors/ip-errors.ts";
import { BunFetchHttpClient, BunHttpClient } from "../fetch/index.ts";
import { IpInfoResponseUnion } from "../schemas/ip-info-schema.ts";
import ipServices from "../worker/ipServices.ts";

export type GetIpDataType = Effect.Effect<
	Lookup,
	IpServicesNotAvailableError,
	never
>;

export class IpInfoService extends Effect.Service<IpInfoService>()("IpInfo", {
	effect: Effect.gen(function* () {
		const client = (yield* BunHttpClient.HttpClient).pipe(
			BunHttpClient.filterStatusOk,
			BunHttpClient.followRedirects(2),
		);

		const lookup = (url: string, proxy: string) =>
			client
				.get(url, {
					proxy,
					// verbose: true,
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

							return geoData;
						}),
					),
				);

		const getIpData = (proxy: string): GetIpDataType =>
			Effect.gen(function* () {
				const ipProviders = yield* Random.shuffle(ipServices);

				return yield* Effect.firstSuccessOf(
					A.fromIterable(ipProviders).map((service) => lookup(service, proxy)),
				).pipe(
					Effect.catchAll(() => Effect.fail(new IpServicesNotAvailableError())),
				);
			});

		return { getIpData } as const;
	}),
	dependencies: [BunFetchHttpClient.layer],
	accessors: true,
}) {}
