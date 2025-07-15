import { IpInfoService } from "@scraper/ip-info";
import type { TUserCookies } from "@scraper/prisma";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import type { IHeroCreateOptions } from "@ulixee/hero";
import Hero from "@ulixee/hero/lib/Hero";
import type IViewport from "@ulixee/unblocked-specification/agent/browser/IViewport";
import type { ICookie } from "@ulixee/unblocked-specification/agent/net/ICookie";
import { Effect } from "effect";
import { FingerprintGenerator } from "fingerprint-generator";
import { HeroError } from "../errors/HeroError";

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

export class HeroAppService extends Effect.Service<HeroAppService>()(
	"HeroAppService",
	{
		effect: Effect.gen(function* (_) {
			const { country, timezone, ip, proxy } = yield* IpInfoService.getIpData();

			const locale = yield* getLocale(country);

			const { navigator, viewport } = yield* getFingerprint();

			const hero = yield* Effect.try({
				try: () =>
					new Hero({
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
					} as IHeroCreateOptions),
				catch: (cause) =>
					new HeroError({
						module: "HeroAppService",
						method: "init",
						description: "Hero init Error",
						cause,
					}),
			});

			return { hero } as const;
		}),
		dependencies: [IpInfoService.Default],
	},
) {}
