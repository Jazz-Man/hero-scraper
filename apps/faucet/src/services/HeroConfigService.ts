import { IpInfoService, PrivoxyService } from "@scraper/ip-info";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import type { IHeroCreateOptions } from "@ulixee/hero";
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

export class HeroConfigService extends Effect.Service<HeroConfigService>()(
	"HeroConfigService",
	{
		effect: Effect.gen(function* () {
			const getConfig = (
				createOptions: IHeroCreateOptions | undefined = undefined,
			) =>
				Effect.gen(function* () {
					const proxy = yield* PrivoxyService.getProxyUrl();

					const { country, timezone, ip } =
						yield* IpInfoService.getIpData(proxy);

					const locale = yield* getLocale(country);

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
							deviceProfile: {
								deviceMemory: navigator.deviceMemory,
								hardwareConcurrency: navigator.hardwareConcurrency,
								viewport,
							},
						},
						viewport,
						dnsOverTlsProvider: OpenDnsAlternate,
						locale,
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

export const HeroConfigServiceLive = HeroConfigService.pipe(
	Effect.provide(FingerprintService.Default),
	Effect.provide(IpInfoService.Default),
	Effect.provide(PrivoxyService.Default),
);
