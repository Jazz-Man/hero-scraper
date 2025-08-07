import type { TSameSiteCookie } from "@scraper/prisma";
import type {
	IRequestInfo,
	IRequestInit,
} from "@ulixee/awaited-dom/base/interfaces/official";
import type { ISuperNode } from "@ulixee/hero";
// import { XPathResult } from "@ulixee/hero";
import { XPathResult } from "@ulixee/hero-interfaces/AwaitedDom";
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
					sessionPersistence: true,
					sessionKeepAlive: true,
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
					// Effect.tap(console.log),
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
				...params: Parameters<HeroParametersType<"querySelector">>
			) => _try(() => hero.querySelector(...params), "querySelector");

			const querySelectorAll = (
				...params: Parameters<HeroParametersType<"querySelectorAll">>
			) => _try(() => hero.querySelectorAll(...params), "querySelectorAll");

			const xpathSelector = (
				...params: Parameters<HeroParametersType<"xpathSelector">>
			) => _try(() => hero.xpathSelector(...params), "xpathSelector");

			const xpathSelectorAll = (
				...params: Parameters<HeroParametersType<"xpathSelectorAll">>
			) => _promise(() => hero.xpathSelectorAll(...params), "xpathSelectorAll");

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

			const deleteCookie = (key: string) =>
				_promise(
					() => hero.activeTab.cookieStorage.removeItem(key),
					"deleteCookie",
				);

			const queryElement = (
				selector: string,
				options?: IWaitForElementOptions,
			) =>
				querySelector(selector).pipe(
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
				queryOptions?: IWaitForElementOptions,
			) =>
				queryElement(selector, queryOptions).pipe(
					_tryMapPromise((element) =>
						hero.interact({
							click: { element, verification: "exactElement" },
						}),
					),
				);

			const typeInput = (
				selector: string,
				content: string,
				queryOptions?: IWaitForElementOptions,
			) =>
				queryElement(selector, queryOptions).pipe(
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
									credentials: "include",
									mode: "cors",
									referrerPolicy: "strict-origin-when-cross-origin",
									redirect: "follow",
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
				getAllCookies,
				deleteCookie,
				getCookie,
				queryElement,
				waitForExists,
				isVisible,
				clickElement,
				typeInput,
				reload,
				close,
				fetch,
				getFrameEnvironment,
				querySelectorAll,
				xpathSelector,
				xpathSelectorAll,
			} as const;
		}),
		dependencies: [HeroAppService.Default],
	},
) {}

export const HeroClientServiceLive = Layer.merge(
	HeroClientService.Default,
	HeroAppServiceLive,
);
