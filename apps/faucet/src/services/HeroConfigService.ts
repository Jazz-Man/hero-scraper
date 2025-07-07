import { IpInfoService } from "@scraper/ip-info";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import type { IHeroCreateOptions } from "@ulixee/hero";
import type IViewport from "@ulixee/unblocked-specification/agent/browser/IViewport";
import { Effect } from "effect";
import { FingerprintGenerator } from "fingerprint-generator";
import { HeroError } from "../errors/HeroError";

export type THeroOptions = IHeroCreateOptions;

const getLocale = (country: string | undefined) =>
	Effect.try({
		try: () =>
			new Intl.Locale(country as unknown as string, {
				region: country as unknown as string,
			}).toString(),
		catch: () => undefined,
	});

const getFingerprint = () =>
	Effect.gen(function* () {
		const fingerprint = yield* Effect.try({
			try: () =>
				new FingerprintGenerator({
					mockWebRTC: true,
					browsers: ["chrome"],
					operatingSystems: ["macos"],
					devices: ["desktop"],
					httpVersion: "2",
				}).getFingerprint().fingerprint,

			catch: (cause) =>
				new HeroError({
					module: "HeroConfigService",
					method: "getFingerprint",
					description: "Fingerprint Error",
					cause,
				}),
		});

		const { navigator, screen } = fingerprint;

		const viewport: IViewport = {
			positionX: screen.pageXOffset,
			positionY: screen.pageYOffset,
			height: screen.height,
			width: screen.width,
			screenWidth: screen.availWidth,
			screenHeight: screen.availHeight,
			colorDepth: screen.colorDepth,
			deviceScaleFactor: screen.devicePixelRatio,
			isDefault: true,
		};

		return { navigator, screen, viewport };
	});

export class HeroConfigService extends Effect.Service<HeroConfigService>()(
	"HeroConfigService",
	{
		effect: Effect.gen(function* () {
			const getConfig = (
				createOptions: IHeroCreateOptions | undefined = undefined,
			) =>
				Effect.gen(function* () {
					const { country, timezone, ip, proxy } =
						yield* IpInfoService.getIpData();

					const locale = yield* getLocale(country);

					const { navigator, viewport } = yield* getFingerprint();

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
		dependencies: [IpInfoService.Default],
	},
) {}

export const HeroConfigServiceLive = HeroConfigService.pipe(
	Effect.provide(IpInfoService.Default),
);
