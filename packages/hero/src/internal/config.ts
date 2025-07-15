import { IpInfoService } from "@scraper/ip-info";
import type { TUserCookies } from "@scraper/prisma";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import type { IHeroCreateOptions } from "@ulixee/hero";
import type { ICookie } from "@ulixee/unblocked-specification/agent/net/ICookie.js";
import { DateTime, Layer } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import {
	getFingerprint,
	getLocale,
} from "../../../../apps/faucet/src/services/HeroConfigService.js";
import type { IInitProfileCookies } from "../../index.js";
import * as internal_context from "./context.js";

/** @internal */
const defaultOptions: IHeroCreateOptions = {
	connectionToCore: {
		host: "ws://localhost:1818",
	},
	dnsOverTlsProvider: OpenDnsAlternate,
	sessionKeepAlive: false,
	sessionPersistence: false,
	showChromeInteractions: false,
	mode: "production",
};

/** @internal */
export const makeConfig = (options?: Partial<IHeroCreateOptions>) => {
	const { namePrefix, ...defaults } = { ...defaultOptions, ...options };

	return {};
};

export const makeConfigNew = (
	cookiesDomain: string,
	profileCookies?: TUserCookies,
) =>
	Effect.gen(function* () {
		const now = yield* DateTime.now;

		const utcDate = DateTime.add(now, { years: 1 });

		const { country, timezone, ip, proxy } = yield* IpInfoService.getIpData();

		const oneYearFromNow = DateTime.add(now, { years: 1 });

		const locale = yield* getLocale(country);

		const { navigator, viewport } = yield* getFingerprint();

		const fixDateWithTimezone = (date?: Date | number | string | undefined) => {
			try {
				let _date: Date | undefined;

				if (typeof date === "number") {
					_date = new Date(date);
				} else if (date instanceof Date) {
					_date = date;
				}

				if (_date instanceof Date) {
					const localDate = _date.toLocaleString("en-US", {
						timeZone: timezone,
						timeZoneName: "longOffset",
						hour12: false,
					});

					return new Date(localDate).toISOString();
				}

				return undefined;
			} catch (e) {
				throw e;
			}
		};

		const prepareProfileCookies = (
			cookies: IInitProfileCookies[] | undefined = undefined,
		): ICookie[] | undefined => {
			if (cookies?.length === 0) {
				return undefined;
			}

			return cookies?.map<ICookie>((cookie: ICookie) => {
				cookie.domain = cookie.domain || cookiesDomain;

				cookie.expires = fixDateWithTimezone(cookie?.expires) as any;

				cookie.path = cookie.path || "/";

				return cookie;
			});
		};

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
				cookies: prepareProfileCookies(profileCookies) as ICookie[],
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
		} as IHeroCreateOptions;
	});

/** @internal */
export const setConfig = (
	cookiesDomain: string,
	profileCookies?: TUserCookies,
) =>
	pipe(
		makeConfigNew(cookiesDomain, profileCookies),
		Effect.map((config) =>
			pipe(
				Context.make(internal_context.HeroConfig, config),
				Context.add(internal_context.ClientConfig, config),
			),
		),
		Layer.effectContext,
	);
