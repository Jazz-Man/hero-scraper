import type Hero from "@ulixee/hero/lib/Hero";
import type IWaitForElementOptions from "@ulixee/hero-interfaces/IWaitForElementOptions";
import type { ILocationTrigger } from "@ulixee/unblocked-specification/agent/browser/Location";
import { Effect, Layer, Ref, Schedule } from "effect";
import type { LazyArg } from "effect/Function";
import { element } from "effect/Schema";
import {
	type AllHeroPropsList,
	HeroAppService,
	HeroAppServiceLive,
	type HeroClassProperties,
	type HeroParametersType,
} from "./HeroAppService";
import {
	HeroCloudFlareChallengeError,
	HeroError,
	HeroHttpNetworcFailure,
} from "./HeroError";

const useValidURL = (url: string): boolean | URL => {
	try {
		return new URL(url);
	} catch (_) {
		return false;
	}
};

const _tryMapPromise = <A, B, E1>(
	fn: (a: A, signal: AbortSignal) => PromiseLike<B>,
	method?: AllHeroPropsList | string,
) =>
	Effect.tryMapPromise({
		try: (a: A, signal) => fn(a, signal),
		catch: (cause) =>
			new HeroError({
				module: "HeroAppService",
				method: method ? method : fn.toString(),
				cause,
			}),
	});

const _promise = <A>(
	fn: (signal: AbortSignal) => PromiseLike<A>,
	method?: AllHeroPropsList | string,
): Effect.Effect<A, HeroError> =>
	Effect.tryPromise({
		try: (signal) => fn(signal),
		catch: (cause: unknown) =>
			new HeroError({
				module: "HeroAppService",
				method: method ? method : fn.toString(),
				cause,
			}),
	});

const _try = <A>(
	fn: LazyArg<A>,
	method?: AllHeroPropsList | string,
): Effect.Effect<A, HeroError> =>
	Effect.try({
		try: () => fn(),
		catch: (cause: unknown) =>
			new HeroError({
				module: "HeroAppService",
				method: method ? method : fn.toString(),
				cause,
			}),
	});

export type HeroPropsTest = HeroClassProperties<
	typeof Hero.prototype.activeTab.cookieStorage
>;

const isCfMitigated = (
	error: unknown,
): error is { status: number; isCloudflare: boolean } => {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	const err = error as Record<string, unknown>;

	return typeof err?.status === "number" && Boolean(err?.isCloudflare);
};

export class HeroClientService extends Effect.Service<HeroClientService>()(
	"HeroClientService",
	{
		effect: Effect.gen(function* (_) {
			const isPageReady = yield* _(Ref.make<boolean>(false));

			const app = yield* _(HeroAppService);

			const waitExistsTimeoutMs = 6000;
			const timeoutMs = 3000;

			const hero = yield* _(
				app.getHero({
					showChrome: true,
					showDevtools: true,
				}),
			);

			const setPageReady = (value: boolean) => _(Ref.set(isPageReady, value));

			const activeTab = () => _try(() => hero.activeTab, "activeTab");

			const getFrameEnvironment = (
				...params: Parameters<HeroParametersType<"getFrameEnvironment">>
			) =>
				Effect.tryPromise({
					try: async () => {
						const iframeEnv = await hero.getFrameEnvironment(...params);

						if (!iframeEnv) {
							throw new Error(
								`Frame environment not found with params: ${JSON.stringify(params)}`,
							);
						}

						await iframeEnv.waitForLoad("AllContentLoaded");

						await iframeEnv.waitForPaintingStable();

						return iframeEnv;
					},
					catch: (cause) =>
						new HeroError({
							module: "HeroAppService",
							method: "getFrameEnvironment",
							cause,
						}),
				});

			const handleTurnstileChallenge = () =>
				Effect.gen(function* () {
					yield* _(waitForContentLoaded(false));

					/// this.hero.flowCommand

					yield* _(waitForNavigation("change", false));

					const isCookieSet = yield* getCookie("cf_chl_rc_m").pipe(
						Effect.map((cookie) => cookie.value === "1"),
					);

					if (isCookieSet) {
						yield* _(waitForContentLoaded(false));

						const spinner = yield* _(
							waitForExists(".main-wrapper .main-content .loading-spinner"),
						);

						const prevDiv = yield* _(
							_promise(() => spinner.previousSibling?.id),
						);

						yield* _promise(() =>
							spinner.$waitForHidden({ timeoutMs: waitExistsTimeoutMs }),
						);

						const iframe = yield* queryElement(`#${prevDiv} > div > div`, {
							waitForVisible: true,
						}).pipe(
							_tryMapPromise((shadowRoot) =>
								shadowRoot.shadowRoot?.querySelector("iframe").$waitForExists(),
							),
						);

						const iframeEnv = yield* getFrameEnvironment(iframe);

						const iframeBody = yield* _promise(() =>
							iframeEnv?.document?.querySelector("body")?.$waitForVisible(),
						).pipe(
							Effect.tap((body) => _promise(() => body.shadowRoot.normalize())),
						);

						if (iframe) {
							yield* _promise(() =>
								hero.interact({
									move: iframe,
								}),
							);
						}

						yield* _promise(() =>
							iframeEnv.document.scrollingElement?.scrollIntoView({
								block: "center",
								inline: "center",
							}),
						);

						const checkbox = yield* _promise(() =>
							iframeBody.shadowRoot
								.querySelector("div.main-wrapper .cb-c label.cb-lb")
								?.$waitForVisible(),
						).pipe(_tryMapPromise((checkbox) => checkbox.$waitForClickable()));

						yield* waitForMillis(1000);
						yield* _promise(() => checkbox.click());

						yield* _(waitForContentLoaded(false));
					}
				});

			const isAllContentLoaded = () =>
				_promise(() => hero.activeTab.isAllContentLoaded);

			const isPaintingStable = () =>
				_promise(() => hero.activeTab.isPaintingStable);

			const url = () => _promise(() => hero.url, "url");

			const waitForLoad = (
				...params: Parameters<HeroParametersType<"waitForLoad">>
			) => _promise(() => hero.waitForLoad(...params), "waitForLoad");

			const goto = (...params: Parameters<HeroParametersType<"goto">>) =>
				Effect.tryPromise({
					try: async () => {
						const goto = await hero.goto(...params);

						const httpResponse = goto.response;

						let httpHeaders: Headers | Map<string, string> | undefined;

						try {
							httpHeaders = new Headers(httpResponse.headers);
						} catch (_e) {
							httpHeaders = new Map(
								Object.entries(httpResponse.headers as Record<string, string>),
							);
						}

						const isCloudflare =
							httpHeaders.get("server")?.toLowerCase() === "cloudflare";

						const isCfMitigated =
							httpHeaders.get("cf-mitigated")?.toLowerCase() === "challenge";

						if (
							httpResponse.statusCode === 403 &&
							isCloudflare &&
							isCfMitigated
						) {
							throw new HeroCloudFlareChallengeError({
								status: httpResponse.statusCode,
								isCloudflare,
							});
						}

						return goto;
					},
					catch: (cause) => {
						if (isCfMitigated(cause)) {
							return new HeroCloudFlareChallengeError({
								status: cause.status,
								isCloudflare: cause.isCloudflare,
							});
						}

						if (cause instanceof Error && cause.message.includes("net::")) {
							return new HeroHttpNetworcFailure({
								name: cause.name,
								message: cause.message,
							});
						}
						return new HeroError({
							module: "HeroAppService",
							method: "gotoBase",
							cause,
						});
					},
				}).pipe(
					Effect.retry({
						times: 3,
						schedule: Schedule.exponential(100).pipe(Schedule.jittered),
						while: (err) => err instanceof HeroHttpNetworcFailure,
					}),
					Effect.catchIf(
						(error) => error._tag === "HeroCloudFlareChallengeError",
						() =>
							Effect.gen(function* () {
								yield* _(waitForContentLoaded(false));

								return true;
							}),
					),
				);

			const waitForMillis = (
				...params: Parameters<HeroParametersType<"waitForMillis">>
			) => _promise(() => hero.waitForMillis(...params), "waitForMillis");

			const querySelector = (
				...params: Parameters<HeroParametersType<"querySelector">>
			) => _try(() => hero.querySelector(...params));

			const getAllCookies = () =>
				_promise(
					() => hero.activeTab.cookieStorage.getItems(),
					"getAllCookies",
				);

			const getCookie = (key: string) =>
				_promise(() => hero.activeTab.cookieStorage.getItem(key), "getCookie");

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

			const waitForContentLoaded = (isPageReady = true) =>
				Effect.gen(function* (_) {
					const isContentLoaded = yield* _(isAllContentLoaded());

					if (!isContentLoaded) {
						yield* _(
							_promise(() =>
								hero.activeTab.waitForLoad("AllContentLoaded", {
									timeoutMs: waitExistsTimeoutMs,
								}),
							),
						);
					}

					const isPaintingStable = yield* _(
						_promise(() => hero.activeTab.isPaintingStable),
					);

					if (!isPaintingStable) {
						yield* _(
							_promise(() =>
								hero.activeTab.waitForPaintingStable({
									timeoutMs: waitExistsTimeoutMs,
								}),
							),
						);
					}

					if (isPageReady) {
						const currentUrl = yield* _(url());

						yield* _(setPageReady(useValidURL(currentUrl) instanceof URL));
					}
				});

			const waitForNavigation = (
				trigger: ILocationTrigger = "change",
				isPageReady = true,
			) =>
				Effect.gen(function* () {
					if (isPageReady) {
						yield* _(setPageReady(isPageReady));
					}

					yield* _(
						_promise(() =>
							hero.waitForLocation(trigger, {
								timeoutMs: timeoutMs,
							}),
						),
					);

					yield* _(waitForContentLoaded(isPageReady));
				});

			const reload = () =>
				Effect.gen(function* (_) {
					yield* _(Ref.set(isPageReady, false));

					yield* _(
						_promise(() =>
							hero.reload({
								timeoutMs: waitExistsTimeoutMs,
							}),
						),
					);

					yield* _(waitForContentLoaded());
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

			return {
				goto,
				waitForMillis,
				querySelector,
				getAllCookies,
				queryElement,
				waitForExists,
				isVisible,
				clickElement,
				typeInput,
				waitForContentLoaded,
				reload,
				close,
			} as const;
		}),
		dependencies: [HeroAppService.Default],
	},
) {}

export const HeroClientServiceLive = Layer.merge(
	HeroClientService.Default,
	HeroAppServiceLive,
);
