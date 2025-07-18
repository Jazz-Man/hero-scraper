import { IpInfoService } from "@scraper/ip-info";
import type { TUserCookies } from "@scraper/prisma";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import ExecuteJsPlugin from "@ulixee/execute-js-plugin";
import type { IHeroCreateOptions } from "@ulixee/hero";
import Hero from "@ulixee/hero/lib/Hero";
import type IViewport from "@ulixee/unblocked-specification/agent/browser/IViewport";
import type { ICookie } from "@ulixee/unblocked-specification/agent/net/ICookie";
import { Data, DateTime, Effect, Layer, Ref } from "effect";
import { FingerprintGenerator } from "fingerprint-generator";

export type TInputValue = string | number;

export type THeroOptions = IHeroCreateOptions;

export interface IInitProfileCookies extends Omit<ICookie, "expires"> {
	expires?: Date | null;
}

export type TProfileCookiesSet = Omit<IInitProfileCookies, "name" | "value">;

export class FingerprintGeneratorError extends Data.TaggedError(
	"FingerprintGeneratorError",
)<{
	cause: unknown;
}> {}

export class HeroAppError extends Data.TaggedError("HeroAppError")<{
	cause: unknown;
}> {}

/**
 * @deprecated
 */
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
				new FingerprintGeneratorError({
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
			const tZoneRef = yield* _(
				Ref.make<DateTime.TimeZone.Named | undefined>(undefined),
			);

			const cookiesDomainRef = yield* _(
				Ref.make<string | undefined>(undefined),
			);

			const now = yield* _(DateTime.now);

			const nowDate = DateTime.toDate(now);

			const prepareProfileCookies = (profileCookies?: TUserCookies) =>
				Effect.gen(function* (_) {
					if (profileCookies?.length === 0) {
						return undefined;
					}

					const tZone = yield* _(Ref.get(tZoneRef));
					const cookiesDomain = yield* _(Ref.get(cookiesDomainRef));

					if (!tZone) {
						return undefined;
					}

					const cookies = profileCookies?.map((cookie) => {
						const expires = cookie.expires
							? DateTime.unsafeMake(cookie.expires)
							: now;

						const expiresNow = DateTime.setParts(expires, {
							year: nowDate.getUTCFullYear(),
						});

						const utc = DateTime.add(expiresNow, { years: 1 });

						const zoned = DateTime.setZone(utc, tZone);

						cookie.expires = DateTime.toDate(zoned);

						cookie.domain = cookie.domain || (cookiesDomain as string);

						cookie.path = cookie.path || "/";

						return cookie;
					});

					return cookies;
				});

			const getHero = (
				options?: IHeroCreateOptions,
				profileCookies?: TUserCookies,
				baseUrl?: URL,
			) =>
				Effect.gen(function* (_) {
					const { country, timezone, ip, proxy } = yield* _(
						IpInfoService.getIpData(),
					);

					yield* _(Ref.set(tZoneRef, DateTime.zoneUnsafeMakeNamed(timezone)));

					if (baseUrl instanceof URL) {
						const hostname = baseUrl.hostname;

						yield* _(
							Ref.set(
								cookiesDomainRef,
								hostname.startsWith("www.")
									? `.${hostname.replace(/^www\./, "")}`
									: hostname,
							),
						);
					}

					const locale = yield* _(getLocale(country));

					const { navigator, viewport } = yield* _(getFingerprint());

					const cookies = yield* _(prepareProfileCookies(profileCookies));

					const hero = yield* Effect.try({
						try: () => {
							const hero = new Hero({
								userAgent: "~ chrome >= 136 && mac",
								connectionToCore: {
									host: "ws://localhost:1818",
								},
								upstreamProxyUrl: proxy,
								upstreamProxyIpMask: {
									publicIp: ip,
									proxyIp: ip,
								},
								userProfile: {
									cookies,
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
								...options,
							} as IHeroCreateOptions);

							hero.use(ExecuteJsPlugin);

							return hero;
						},
						catch: (cause) =>
							new HeroAppError({
								cause,
							}),
					});

					// trigger error if hero is not connected
					yield* _(
						Effect.tryPromise({
							try: () => hero.meta,
							catch: (cause) =>
								new HeroAppError({
									cause,
								}),
						}),
					);

					return hero;
				});

			return { getHero } as const;
		}),
		dependencies: [IpInfoService.Default],
	},
) {}

export const HeroAppServiceLive = Layer.merge(
	HeroAppService.Default,
	IpInfoService.Default,
);
