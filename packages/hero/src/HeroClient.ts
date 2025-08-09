import type { TSameSiteCookie } from "@scraper/prisma";
import type {
	IRequestInfo,
	IRequestInit,
} from "@ulixee/awaited-dom/base/interfaces/official";
import type { ISuperNode } from "@ulixee/hero";
import { XPathResult } from "@ulixee/hero-interfaces/AwaitedDom";
import type ISetCookieOptions from "@ulixee/hero-interfaces/ISetCookieOptions";
import type IWaitForElementOptions from "@ulixee/hero-interfaces/IWaitForElementOptions";
import type { ILocationTrigger } from "@ulixee/unblocked-specification/agent/browser/Location";
import { Console, Effect, Layer, Schedule } from "effect";
import {
	_promise,
	_try,
	_tryMapPromise,
	HeroAppService,
	HeroAppServiceLive,
	type HeroParametersType,
} from "./HeroAppService";
import { HeroHttpError, HeroHttpNetworcFailure } from "./HeroError";

type QueryElementParams = [
	selector: string,
	isXpath: boolean,
	orderedNodeResults?: boolean,
	options?: IWaitForElementOptions,
];

const useValidURL = (url: string): boolean | URL => {
	try {
		return new URL(url);
	} catch (_) {
		return false;
	}
};

const policy = Schedule.exponential(1000).pipe(
	Schedule.jittered,
	Schedule.onDecision((_out, decision) =>
		decision._tag === "Continue"
			? Effect.logInfo("Retry after HeroHttpNetworcFailure")
			: Effect.void,
	),
);

export class HeroClientService extends Effect.Service<HeroClientService>()(
	"HeroClientService",
	{
		effect: Effect.gen(function* ($) {
			const app = yield* $(HeroAppService);

			const waitExistsTimeoutMs = 6000;

			const hero = yield* $(
				app.getHero({
					showChrome: true,
					showDevtools: true,
					showChromeInteractions: true,
					sessionPersistence: false,
					sessionKeepAlive: false,
				}),
			);

			const goto = (...params: Parameters<HeroParametersType<"goto">>) =>
				_promise(() => hero.goto(...params), "goto").pipe(
					Effect.flatMap((result) =>
						Effect.gen(function* () {
							const httpResponse = result.response;

							let httpHeaders: Headers | Map<string, string> | undefined;

							try {
								httpHeaders = new Headers(httpResponse.headers);
							} catch (_e) {
								httpHeaders = new Map(
									Object.entries(
										httpResponse.headers as Record<string, string>,
									),
								);
							}

							if (httpResponse.statusCode !== 200) {
								const retryAfter = httpHeaders.has("retry-after")
									? (httpHeaders.get("retry-after") as string)
									: undefined;

								const isCfMitigated =
									httpHeaders.get("cf-mitigated")?.toLowerCase() ===
									"challenge";

								return yield* Effect.fail(
									new HeroHttpError({
										status: httpResponse.statusCode,
										isCloudflare: isCfMitigated,
										retryAfter,
									}),
								);
							}

							yield* $(waitForStableState());

							return result;
						}),
					),
					Effect.retry({
						times: 3,
						schedule: policy,
						while: (err) => err instanceof HeroHttpNetworcFailure,
					}),
				);

			const getFrameEnvironment = (
				...params: Parameters<HeroParametersType<"getFrameEnvironment">>
			) =>
				_promise(async () => {
					const iframeEnv = await hero.getFrameEnvironment(...params);
					if (!iframeEnv) {
						throw new Error(
							`Frame environment not found with params: ${JSON.stringify(params)}`,
						);
					}

					await iframeEnv.waitForLoad("AllContentLoaded");

					await iframeEnv.waitForPaintingStable();

					return iframeEnv;
				});

			const waitForMillis = (
				...params: Parameters<HeroParametersType<"waitForMillis">>
			) => _promise(() => hero.waitForMillis(...params), "waitForMillis");

			const querySelector = (
				selector: string,
				isXpath = false,
				orderedNodeResults?: boolean,
			) =>
				_try(
					() =>
						isXpath
							? hero.xpathSelector(selector, orderedNodeResults)
							: hero.querySelector(selector),
					"querySelector",
				);

			const querySelectorAll = (
				selector: string,
				isXpath = false,
				orderedNodeResults?: boolean,
			) =>
				isXpath
					? _promise(
							() => hero.xpathSelectorAll(selector, orderedNodeResults),
							"xpathSelectorAll",
						)
					: _try(() => hero.querySelectorAll(selector), "querySelectorAll");

			const getAllCookies = () =>
				_promise(
					() => hero.activeTab.cookieStorage.getItems(),
					"getAllCookies",
				).pipe(
					Effect.map((cookies) => {
						const _cookies = cookies.filter(
							(cookie) =>
								cookie.name?.length > 0 && cookie.name !== "undefined",
						);

						return _cookies?.map((cookie) => ({
							name: cookie.name,
							value: cookie.value,
							domain: cookie.domain as string,
							path: cookie.path as string,
							expires: cookie.expires ? new Date(cookie.expires) : null,
							secure: cookie.secure as boolean,
							httpOnly: cookie.httpOnly as boolean,
							sameSite: cookie.sameSite as TSameSiteCookie,
							sameParty: cookie.sameParty as boolean,
						}));
					}),
				);

			const getCookie = (key: string) =>
				_promise(() => hero.activeTab.cookieStorage.getItem(key), "getCookie");

			const setCookie = (
				name: string,
				value: string,
				options?: ISetCookieOptions,
			) =>
				_promise(
					() => hero.activeTab.cookieStorage.setItem(name, value, options),
					"setCookie",
				);

			const deleteCookie = (key: string) =>
				_promise(
					() => hero.activeTab.cookieStorage.removeItem(key),
					"deleteCookie",
				);

			const queryElement = (
				selector: string,
				isXpath = false,
				orderedNodeResults?: boolean,
				options?: IWaitForElementOptions,
			) =>
				querySelector(selector, isXpath, orderedNodeResults).pipe(
					_tryMapPromise((element) =>
						hero.activeTab.waitForElement(element, {
							timeoutMs: waitExistsTimeoutMs,
							...options,
						}),
					),
				);

			const waitForExists = (
				selector: string,
				options?: IWaitForElementOptions,
			) =>
				_promise(() =>
					hero.document.querySelector(selector).$waitForExists({
						timeoutMs: waitExistsTimeoutMs,
						...options,
					}),
				);

			const isVisible = (
				...params: Parameters<HeroParametersType<"querySelector">>
			) =>
				querySelector(...params).pipe(
					_tryMapPromise((element) => element.$isVisible),
				);

			const waitForStableState = () =>
				_promise(() =>
					hero.waitForState({
						all(assert) {
							assert(hero.url, (url) => useValidURL(url) instanceof URL);
							assert(hero.isAllContentLoaded);
							assert(hero.isPaintingStable);
						},
					}),
				);

			const reload = () =>
				Effect.gen(function* (_) {
					yield* _(
						_promise(() =>
							hero.reload({
								timeoutMs: waitExistsTimeoutMs,
							}),
						),
					);

					yield* _(waitForStableState());
				});

			const clickElement = (
				selector: string,
				isXpath = false,
				orderedNodeResults?: boolean,
				options?: IWaitForElementOptions,
			) =>
				queryElement(selector, isXpath, orderedNodeResults, options).pipe(
					_tryMapPromise((element) =>
						hero.interact({
							click: { element, verification: "exactElement" },
						}),
					),
				);

			const typeInput = (
				selector: string,
				content: string,
				isXpath = false,
				orderedNodeResults?: boolean,
				options?: IWaitForElementOptions,
			) =>
				queryElement(selector, isXpath, orderedNodeResults, options).pipe(
					_tryMapPromise((element) =>
						hero.interact({
							click: { element, verification: "exactElement" },
							type: content,
						}),
					),
				);

			const close = () => _promise(() => hero.close(), "close");

			const fetch = (_input: IRequestInfo, _init?: IRequestInit) =>
				Effect.gen(function* () {
					const request = yield* $(
						_try(
							() =>
								new hero.Request(_input, {
									// credentials: "include",
									// mode: "cors",
									// referrerPolicy: "strict-origin-when-cross-origin",
									// redirect: "follow",
									..._init,
								}),
						),
					);

					return yield* $(_promise(() => hero.fetch(request)));
				});

			return {
				goto,
				waitForMillis,
				querySelector,
				querySelectorAll,
				getAllCookies,
				deleteCookie,
				getCookie,
				setCookie,
				queryElement,
				waitForExists,
				isVisible,
				clickElement,
				typeInput,
				reload,
				close,
				fetch,
				getFrameEnvironment,
			} as const;
		}),
		dependencies: [HeroAppService.Default],
	},
) {}

export const HeroClientServiceLive = Layer.merge(
	HeroClientService.Default,
	HeroAppServiceLive,
);
