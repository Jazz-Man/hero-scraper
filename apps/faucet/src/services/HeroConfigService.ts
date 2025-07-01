import { IpInfoService, PrivoxyService } from "@scraper/ip-info";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import type { IHeroCreateOptions } from "@ulixee/hero";
import type IGeolocation from "@ulixee/unblocked-specification/plugin/IGeolocation";
import { Effect } from "effect";
import { HeroError } from "../errors/HeroError";
import { FingerprintService } from "./Fingerprint";

export type THeroOptions = IHeroCreateOptions;

const getLocale = (country: string | undefined) =>
	Effect.try({
		try: () =>
			new Intl.Locale(country as unknown as string, {
				region: country as unknown as string,
			}).toString(),
		catch: () => undefined,
	});

const getGeolocation = (ll: [number, number] | undefined) =>
	Effect.try({
		try: () => {
			if (!ll) {
				return undefined;
			}

			let location: Partial<IGeolocation> | undefined;

			const latitude: number | undefined = ll.at(0);
			const longitude: number | undefined = ll.at(1);

			if (latitude && !(Math.abs(latitude) <= 90)) {
				location = {};

				location.latitude = latitude;
			}

			if (longitude && !(Math.abs(longitude) <= 180)) {
				location = location || {};
				location.longitude = longitude;
			}

			return location as IGeolocation;
		},
		catch: () => undefined,
	});

export class HeroConfigService extends Effect.Service<HeroConfigService>()(
	"HeroConfigService",
	{
		effect: Effect.gen(function* () {
			const getConfig = (
				createOptions: IHeroCreateOptions | undefined = undefined,
			) =>
				Effect.gen(function* () {
					const proxy = yield* PrivoxyService.getProxyUrl();

					const { country, ll, timezone, ip } =
						yield* IpInfoService.getIpData(proxy);

					const locale = yield* getLocale(country);
					const geolocation = yield* getGeolocation(ll);

					const { navigator, viewport } =
						yield* FingerprintService.getFingerprint();

					return {
						connectionToCore: {
							host: "ws://localhost:1818",
						},
						upstreamProxyUrl: proxy,
						upstreamProxyIpMask: {
							publicIp: ip,
							proxyIp: ip,
						},
						userProfile: {
							timezoneId: timezone,
							locale,
							geolocation,
							deviceProfile: {
								deviceMemory: navigator.deviceMemory,
								hardwareConcurrency: navigator.hardwareConcurrency,
								viewport,
							},
						},
						viewport,
						dnsOverTlsProvider: OpenDnsAlternate,
						locale,
						geolocation,
						timezoneId: timezone,
						sessionKeepAlive: false,
						sessionPersistence: false,
						showChromeInteractions: false,
						mode: "production",
						...createOptions,
					} as IHeroCreateOptions;
				});

			const getCookiesDomain = (siteUrl: string) =>
				Effect.try({
					try: () => {
						const baseUrl = new URL(siteUrl);

						const hostname = baseUrl.hostname;

						return hostname.startsWith("www.")
							? `.${hostname.replace(/^www\./, "")}`
							: hostname;
					},
					catch: (cause) =>
						new HeroError({
							module: "HeroConfigService",
							method: "getCookiesDomain",
							description: "Invalid URL",
							cause,
						}),
				});

			return { getConfig, getCookiesDomain } as const;
		}),
		dependencies: [
			FingerprintService.Default,
			IpInfoService.Default,
			PrivoxyService.Default,
		],
	},
) {}
