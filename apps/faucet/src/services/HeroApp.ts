import { IpInfoService, PrivoxyService } from "@scraper/ip-info";
import type { TUserCookies } from "@scraper/prisma";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import type { IHeroCreateOptions } from "@ulixee/hero";
import Hero from "@ulixee/hero/lib/Hero";
import type { ICookie } from "@ulixee/unblocked-specification/agent/net/ICookie";
import type IGeolocation from "@ulixee/unblocked-specification/plugin/IGeolocation";
import { Effect } from "effect";

import { FingerprintService } from "./Fingerprint";

export type TInputValue = string | number;

export type THeroOptions = IHeroCreateOptions;

type TTimeoutMsOptions = {
	timeoutMs?: number;
};

type TTGotoOptions = {
	referrer?: string;
} & TTimeoutMsOptions;

export interface IInitProfileCookies extends Omit<ICookie, "expires"> {
	expires?: Date | null;
}

export type TProfileCookiesSet = Omit<IInitProfileCookies, "name" | "value">;

export type THeroAppOptions = {
	baseUrl: string;
	createOptions?: THeroOptions;
	profileCookies?: TUserCookies;
	reinitWaitMs?: number; // default: 3?
	reinitMaxCount?: number; // default: 3?
	timeoutMs?: number; // default: 30000
	waitExistsTimeoutMs?: number; // default: this.timeoutMs
	waitForContentLoadedMs?: number; // default: this.timeoutMs
};

export class HeroAppService extends Effect.Service<HeroAppService>()(
	"HeroAppService",
	{
		effect: Effect.gen(function* () {
			const proxy = yield* PrivoxyService.getProxyUrl();

			const getHero = (options: THeroAppOptions) =>
				Effect.gen(function* () {
					const { country, ll, timezone, ip } =
						yield* IpInfoService.getIpData(proxy);

					const locale = yield* Effect.try({
						try: () =>
							new Intl.Locale(country as unknown as string, {
								region: country as unknown as string,
							}).toString(),
						catch: () => undefined,
					});

					const { navigator, viewport } =
						yield* FingerprintService.getFingerprint();

					const geolocation = yield* Effect.try({
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

					const heroApp = new Hero({
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
					} as THeroOptions);

					return heroApp;
				});

			return { getHero } as const;
		}),
		dependencies: [
			FingerprintService.Default,
			IpInfoService.Default,
			PrivoxyService.Default,
		],
	},
) {}
