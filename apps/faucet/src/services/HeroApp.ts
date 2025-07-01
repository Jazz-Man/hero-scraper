import { IpInfoService, PrivoxyService } from "@scraper/ip-info";
import type { TUserCookies } from "@scraper/prisma";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import type { IHeroCreateOptions } from "@ulixee/hero";
import Hero from "@ulixee/hero/lib/Hero";
import type { ICookie } from "@ulixee/unblocked-specification/agent/net/ICookie";
import type IGeolocation from "@ulixee/unblocked-specification/plugin/IGeolocation";
import { Effect } from "effect";

import { FingerprintService } from "./Fingerprint";
import { HeroConfigService } from "./HeroConfigService";

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
					const config = yield* HeroConfigService;

					const heroConfig = yield* config.getConfig();

					const heroApp = new Hero(heroConfig);

					return heroApp;
				});

			return { getHero } as const;
		}),
		dependencies: [HeroConfigService.Default],
	},
) {}
