import getPublicIP from "@scraper/ip-info";
import type { TSameSiteCookie, TUserCookies } from "@scraper/prisma";
import { type TSafePromiseOptions, safe, safePromise } from "@scraper/safe";
import type {
	IRequestInfo,
	IRequestInit,
} from "@ulixee/awaited-dom/base/interfaces/official";
import type Response from "@ulixee/awaited-dom/impl/official-klasses/Response";
import { OpenDnsAlternate } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import ExecuteJsPlugin from "@ulixee/execute-js-plugin";
import type { IHeroCreateOptions, ISuperElement, Tab } from "@ulixee/hero";
import type ISetCookieOptions from "@ulixee/hero-interfaces/ISetCookieOptions";
import type IWaitForElementOptions from "@ulixee/hero-interfaces/IWaitForElementOptions";
import type CookieStorage from "@ulixee/hero/lib/CookieStorage";
import Hero from "@ulixee/hero/lib/Hero";
import type Resource from "@ulixee/hero/lib/Resource";
import type ResourceResponse from "@ulixee/hero/lib/ResourceResponse";
import type { ILocationTrigger } from "@ulixee/unblocked-specification/agent/browser/Location";
import type { ICookie } from "@ulixee/unblocked-specification/agent/net/ICookie";
import type IGeolocation from "@ulixee/unblocked-specification/plugin/IGeolocation";

import type { IMousePositionXY } from "@ulixee/unblocked-specification/agent/interact/IInteractions";

import { DecoratorBaseClass, needsInit } from "@scraper/decorators";
import getFingerprint from "./fingerprint.ts";

export type { IMousePositionXY };

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

export type THero = Hero;
export type TTab = Tab;

export default class HeroApp extends DecoratorBaseClass {
	private timezone: string | undefined;
	private readonly oneYearFromNow: Date;
	private readonly cookiesDomain: string;
	private readonly createOptions: THeroOptions | undefined = undefined;
	private readonly profileCookies: TUserCookies | undefined;
	private readonly timeoutMs: number = 30000;
	private readonly waitExistsTimeoutMs: number = this.timeoutMs;
	private readonly waitForContentLoadedMs: number;
	private readonly reinitWaitMs: number;
	private baseUrl: URL;
	private reinitCount = 0;
	private reinitMaxCount = 3;
	private hero: THero;

	private pageResponse: ResourceResponse;
	private pageResponseHeaders: Headers;

	constructor(private options: THeroAppOptions) {
		super();
		this.timeoutMs = this.options.timeoutMs || 30000;
		this.waitExistsTimeoutMs =
			this.options.waitExistsTimeoutMs || this.timeoutMs;
		this.waitExistsTimeoutMs =
			this.options.waitExistsTimeoutMs || this.timeoutMs;

		this.reinitWaitMs = this.options.reinitWaitMs || 1000;

		this.waitForContentLoadedMs = this.options.waitForContentLoadedMs || 5000;
		this.createOptions = this.options.createOptions || undefined;
		this.profileCookies = this.options.profileCookies || undefined;

		try {
			this.baseUrl = new URL(this.options.baseUrl);

			const hostname = this.baseUrl.hostname;

			this.cookiesDomain = hostname.startsWith("www.")
				? `.${hostname.replace(/^www\./, "")}`
				: hostname;
		} catch (e) {
			throw new Error(`Invalid URL: ${this.options.baseUrl}`);
		}

		this.oneYearFromNow = new Date();
		this.oneYearFromNow.setFullYear(this.oneYearFromNow.getFullYear() + 1);
	}

	private _activeTab: TTab;

	get activeTab(): TTab {
		return this._activeTab;
	}

	private _cookieStorage: CookieStorage;

	get cookieStorage(): CookieStorage {
		return this._cookieStorage;
	}

	static async init(options: THeroAppOptions) {
		const app = new HeroApp(options);
		return await app.getHero();
	}

	async getHero(): Promise<Hero> {
		const { country, ll, ip, timezone, proxy } = await getPublicIP();

		this.timezone = timezone;

		const intLocale = safe<string>(() =>
			new Intl.Locale(country as unknown as string, {
				region: country as unknown as string,
			}).toString(),
		);

		const locale = intLocale.success ? intLocale.data : undefined;

		let geolocation: Partial<IGeolocation> | undefined = undefined;

		if (ll) {
			const latitude: number | undefined = ll.at(0);
			const longitude: number | undefined = ll.at(1);

			if (latitude && !(Math.abs(latitude) <= 90)) {
				geolocation = {};

				geolocation.latitude = latitude;
			}

			if (longitude && !(Math.abs(longitude) <= 180)) {
				geolocation = geolocation || {};
				geolocation.longitude = longitude;
			}
		}

		const { navigator, viewport } = await getFingerprint();

		this.hero = new Hero({
			connectionToCore: {
				host: "ws://localhost:1818",
			},
			upstreamProxyUrl: proxy,
			upstreamProxyIpMask: {
				publicIp: ip,
				proxyIp: ip,
			},
			userProfile: {
				cookies: this.prepareProfileCookies(this.profileCookies),
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
			...this.createOptions,
		} as THeroOptions);

		this.hero.use(ExecuteJsPlugin);

		this._activeTab = this.hero.activeTab;
		this._cookieStorage = this._activeTab.cookieStorage;

		this.isInitialised = true;

		return this.hero;
	}

	async waitForMillis(ms = 1000) {
		await safe(this.hero.waitForMillis(ms));
	}

	@needsInit()
	private async handleTurnstileChallenge() {
		await this.waitForContentLoaded(false);

		const handle = async () => {
			const frames = await this.hero.activeTab.frameEnvironments;

			for (const frame of frames) {
				const isMainFrame = await frame.isMainFrame;

				if (isMainFrame) {
					continue;
				}

				const frameUrl = this.useValidURL(await frame.url);

				if (!(frameUrl instanceof URL)) {
					continue;
				}

				if (frameUrl.protocol !== "https:") {
					continue;
				}

				if (frameUrl.hostname !== "challenges.cloudflare.com") {
					continue;
				}

				await frame.waitForLoad("AllContentLoaded");
				await frame.waitForPaintingStable();

				const body = frame.document.body;

				if (!body) {
					continue;
				}

				const isVisible = await body.$isVisible;

				if (!isVisible) {
					continue;
				}

				await body.shadowRoot.normalize();

				await frame.document.scrollingElement?.scrollIntoView({
					block: "center",
					inline: "center",
				});

				const checkbox = await body.shadowRoot
					?.querySelector("div.main-wrapper .cb-c label.cb-lb")
					?.$waitForVisible();

				await checkbox?.$waitForClickable();

				await checkbox?.click();
			}
		};

		await this.hero.flowCommand(
			async () => {
				await handle();
			},

			(assert) =>
				assert(
					this.hero.activeTab.querySelector('[name="cf-turnstile-response"]')
						.$exists,
				),
		);

		await this.waitForNavigation("change", false);

		const url = await this.hero.url;
		const cfCookie = await this.cookieStorage.getItem("cf_chl_rc_m");

		console.log({ cfCookie, url });

		if (cfCookie?.value === "1") {
			await this.waitForContentLoaded(false);
			const spinner = await this.waitForExists(
				".main-wrapper .main-content .loading-spinner",
			);

			const prevDiv = await spinner.previousSibling?.id;

			await spinner.$waitForHidden({ timeoutMs: this.waitExistsTimeoutMs });

			const shadowRoot = await this.queryElement(`#${prevDiv} > div > div`, {
				waitForVisible: true,
			});

			const iframe = await shadowRoot.shadowRoot
				?.querySelector("iframe")
				.$waitForExists();

			const iframeEnv = await this.hero.getFrameEnvironment(iframe);

			await iframeEnv?.waitForLoad("AllContentLoaded");
			await iframeEnv?.waitForPaintingStable();

			const iframeBody = await iframeEnv?.document
				?.querySelector("body")
				?.$waitForVisible();

			if (iframe) {
				await this.hero.interact({
					move: iframe,
				});
			}

			await iframeBody?.shadowRoot.normalize();

			await iframeEnv?.document.scrollingElement?.scrollIntoView({
				block: "center",
				inline: "center",
			});

			const checkbox = await iframeBody?.shadowRoot
				.querySelector("div.main-wrapper .cb-c label.cb-lb")
				?.$waitForVisible();

			await checkbox?.$waitForClickable();

			await this.waitForMillis();

			await checkbox?.click();

			await this.waitForContentLoaded(false);
		}
	}

	private useValidURL(url: string): boolean | URL {
		try {
			return new URL(url);
		} catch (_) {
			return false;
		}
	}

	@needsInit()
	async goto(
		href: string,
		options: TTGotoOptions = {
			timeoutMs: this.timeoutMs,
		},
	) {
		const url = this.useValidURL(href);

		if (!url) {
			throw new Error(`Invalid URL: ${href}`);
		}

		this.isPageReady = false;

		const goto = await safePromise<Resource>(
			this.hero.goto(url.toString(), options),
		);

		this.pageResponse = goto.response;

		const statusCode = this.pageResponse.statusCode;

		this.pageResponseHeaders = new Headers(
			this.pageResponse.headers as HeadersInit,
		);

		if (statusCode >= 500) {
			const e = new Error(
				`page "${url.toString()}" is not accessible: code ${statusCode}.`,
			);

			if (this.reinitCount < this.reinitMaxCount) {
				this.reinitCount++;

				console.error(e);

				console.info("reinit");

				await this.hero.waitForMillis(this.reinitWaitMs);

				await this.hero.close();

				this.hero = await HeroApp.init(this.options);

				await this.goto(href, options);

				return;
			}

			await this.hero.close();

			throw e;
		} else if (statusCode === 403) {
			const e = new Error("page is not accessible: code 403.");

			const serverInfo = this.pageResponseHeaders.get("server");

			const isCloudflare = serverInfo?.toLocaleLowerCase() === "cloudflare";

			if (!isCloudflare) {
				throw e;
			}

			console.error({ statusCode });
			try {
				await this.handleTurnstileChallenge();
			} catch (e) {
				throw e;
			}
		}

		await this.waitForContentLoaded();
	}

	@needsInit()
	async getJsValue<T>(path: string, options?: TSafePromiseOptions): Promise<T> {
		return safePromise<T>(this.hero.getJsValue<T>(path), options);
	}

	@needsInit()
	async querySelector(selector: string): Promise<ISuperElement> {
		return safePromise<ISuperElement>(() => this.hero.querySelector(selector));
	}

	async isVisible(selector: string): Promise<boolean> {
		const element = await this.querySelector(selector);

		return element ? element.$isVisible : false;
	}

	@needsInit()
	async reload() {
		this.isPageReady = false;
		await this.activeTab.reload({
			timeoutMs: this.waitExistsTimeoutMs,
		});
		await this.waitForContentLoaded();
	}

	@needsInit()
	async waitForContentLoaded(setPageReady = true) {
		const isContentLoaded = await this.hero.activeTab.isAllContentLoaded;

		if (!isContentLoaded) {
			await this.hero.activeTab.waitForLoad("AllContentLoaded", {
				timeoutMs: this.waitExistsTimeoutMs,
			});
		}

		const isPaintingStable = await this.hero.activeTab.isPaintingStable;

		if (!isPaintingStable) {
			await this.hero.activeTab.waitForPaintingStable({
				timeoutMs: this.waitExistsTimeoutMs,
			});
		}

		if (setPageReady) {
			const currentUrl = await this.hero.url;

			this.isPageReady = this.useValidURL(currentUrl) instanceof URL;
		}
	}

	async queryElement(
		selector: string,
		options?: IWaitForElementOptions,
	): Promise<ISuperElement> {
		const element = await this.querySelector(selector);

		return safePromise<ISuperElement>(
			this.activeTab.waitForElement(element, {
				timeoutMs: this.waitExistsTimeoutMs,
				...options,
			}),
		);
	}

	async getInputValue<T extends TInputValue = string>(
		selector: string,
		timeout: number = this.timeoutMs,
	): Promise<T> {
		const element = await this.waitForExists(selector, {
			timeoutMs: this.waitExistsTimeoutMs,
		});

		const startTime = Date.now();

		async function getValue(): Promise<T | undefined> {
			const value = (await element.value) as T;

			if (value?.toString()?.length > 0) {
				return value;
			} else if (Date.now() - startTime > timeout) {
				throw new Error(`Get Input Value timeout: "${selector}"`);
			} else {
				setTimeout(async () => await getValue(), 1000);
			}
		}

		const value = await safePromise<T | undefined>(getValue());

		return value as T;
	}

	@needsInit()
	async waitForExists(selector: string, options?: IWaitForElementOptions) {
		return safePromise<ISuperElement>(
			this.hero.document
				.querySelector(selector)
				.$waitForExists({ timeoutMs: this.waitExistsTimeoutMs, ...options }),
			{
				err: `Wait for exists: "${selector}"`,
			},
		);
	}

	async clickElement(selector: string, queryOptions?: IWaitForElementOptions) {
		const element = await this.queryElement(selector, queryOptions);
		await safe(
			this.hero.interact({
				click: { element, verification: "exactElement" },
			}),
		);
	}

	async typeInput(
		selector: string,
		content: string,
		queryOptions?: IWaitForElementOptions,
	) {
		const element = await this.queryElement(selector, queryOptions);
		await safe(
			this.hero.interact({
				click: { element, verification: "exactElement" },
				type: content,
			}),
		);
	}

	/**
	 * Calls hero's waitForLocation and then waitForLoad.
	 *
	 * @param trigger The waitForLocation trigger
	 * @param setPageReady
	 */
	@needsInit()
	async waitForNavigation(
		trigger: ILocationTrigger = "change",
		setPageReady = true,
	) {
		if (setPageReady) {
			this.isPageReady = false;
		}

		await this.hero.waitForLocation(trigger, {
			timeoutMs: this.timeoutMs,
		});
		await this.waitForContentLoaded(setPageReady);
	}

	@needsInit()
	async fetch(_input: IRequestInfo, _init?: IRequestInit): Promise<Response> {
		const request = new this.hero.Request(_input, {
			credentials: "include",
			mode: "cors",
			referrerPolicy: "strict-origin-when-cross-origin",
			redirect: "follow",
			..._init,
		});

		return safePromise(this.hero.fetch(request), {
			logError: true,
		});
	}

	@needsInit()
	async setCookie(
		name: string,
		value: string,
		options: TProfileCookiesSet = {},
	) {
		return await this.cookieStorage.setItem(
			name,
			value,
			this.prepareProfileCookie(
				options as IInitProfileCookies,
			) as ISetCookieOptions,
		);
	}

	@needsInit()
	async getCookie(key: string): Promise<ICookie> {
		return await this.cookieStorage.getItem(key);
	}

	@needsInit()
	async deleteCookie(key: string): Promise<boolean> {
		return await this.cookieStorage.removeItem(key);
	}

	@needsInit()
	async getAllCookies(): Promise<ICookie[]> {
		return await this.cookieStorage.getItems();
	}

	@needsInit()
	async exportCookies(): Promise<TUserCookies | undefined> {
		const profile = await this.hero.exportUserProfile();

		const cookies = profile.cookies?.filter(
			(cookie) => cookie.name?.length > 0 && cookie.name !== "undefined",
		);

		// @ts-ignore
		return cookies?.map((cookie) => ({
			name: cookie.name,
			value: cookie.value,
			domain: cookie.domain as string,
			path: cookie.path as string,
			expires: cookie.expires,
			secure: cookie.secure as boolean,
			httpOnly: cookie.httpOnly as boolean,
			sameSite: cookie.sameSite as TSameSiteCookie,
			sameParty: cookie.sameParty as boolean,
		}));
	}

	private fixDateWithTimezone = (
		date?: Date | number | undefined,
	): Date | undefined => {
		try {
			let _date: Date | undefined = undefined;

			if (typeof date === "number") {
				_date = new Date(date);
			} else if (date instanceof Date) {
				_date = date;
			}

			if (_date instanceof Date) {
				const localDate = _date.toLocaleString("en-US", {
					timeZone: this.timezone,
					timeZoneName: "longOffset",
					hour12: false,
				});

				return new Date(localDate);
			}

			return undefined;
		} catch (e) {
			throw e;
		}
	};

	private prepareProfileCookie(cookie: IInitProfileCookies) {
		cookie.domain = cookie.domain || this.cookiesDomain;
		cookie.expires = this.fixDateWithTimezone(
			cookie?.expires || this.oneYearFromNow,
		);

		cookie.path = cookie.path || "/";

		return cookie;
	}

	private prepareProfileCookies(
		cookies: IInitProfileCookies[] | undefined = undefined,
	): IInitProfileCookies[] | undefined {
		if (cookies?.length === 0) {
			return undefined;
		}

		return cookies?.map((cookie) => this.prepareProfileCookie(cookie));
	}
	async close() {
		await this.hero.close();
	}

	async [Symbol.asyncDispose]() {
		await this.close();
	}
}
