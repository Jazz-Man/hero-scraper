import type Hero from "@ulixee/hero/lib/Hero";
import type IWaitForElementOptions from "@ulixee/hero-interfaces/IWaitForElementOptions";
import type { HeadersInit } from "bun";
import { Effect, Layer, Ref, Schedule } from "effect";
import type { LazyArg } from "effect/Function";
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
	HeroHttpError,
	HeroHttpNetworcFailure,
} from "./HeroError";

const useValidURL = (url: string): boolean | URL => {
	try {
		return new URL(url);
	} catch (_) {
		return false;
	}
};

const tryPromiseWrapp = <A>(
	fn: (signal: AbortSignal) => PromiseLike<A>,
	method: AllHeroPropsList | string,
): Effect.Effect<A, HeroError> =>
	Effect.tryPromise({
		try: (signal) => fn(signal),
		catch: (cause) =>
			new HeroError({
				module: "HeroAppService",
				method,
				cause,
			}),
	});

const tryWrapp = <A>(
	fn: LazyArg<A>,
	method: AllHeroPropsList | string,
): Effect.Effect<A, HeroError> =>
	Effect.try({
		try: () => fn(),
		catch: (cause) =>
			new HeroError({
				module: "HeroAppService",
				method,
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

			const heroRef = yield* _(
				Ref.make(
					yield* app.getHero({
						showChrome: true,
						showDevtools: true,
					}),
				),
			);

			const hero = yield* _(
				app.getHero({
					showChrome: true,
					showDevtools: true,
				}),
			);

			const activeTab = () => tryWrapp(() => hero.activeTab, "activeTab");

			const isAllContentLoaded = () =>
				tryPromiseWrapp(
					() => hero.activeTab.isAllContentLoaded,
					"isAllContentLoaded",
				);

			const isPaintingStable = () =>
				tryPromiseWrapp(
					() => hero.activeTab.isPaintingStable,
					"isPaintingStable",
				);

			const url = () => tryPromiseWrapp(() => hero.url, "url");

			const waitForLoad = (
				...params: Parameters<HeroParametersType<"waitForLoad">>
			) => tryPromiseWrapp(() => hero.waitForLoad(...params), "waitForLoad");

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
				);

			const waitForMillis = (
				...params: Parameters<HeroParametersType<"waitForMillis">>
			) =>
				tryPromiseWrapp(() => hero.waitForMillis(...params), "waitForMillis");

			const querySelector = (
				...params: Parameters<HeroParametersType<"querySelector">>
			) => tryWrapp(() => hero.querySelector(...params), "querySelector");

			const getAllCookies = () =>
				tryPromiseWrapp(
					() => hero.activeTab.cookieStorage.getItems(),
					"getAllCookies",
				);

			const getCookie = (key: string) =>
				tryPromiseWrapp(
					() => hero.activeTab.cookieStorage.getItem(key),
					"getCookie",
				);

			const queryElement = (
				selector: string,
				options?: IWaitForElementOptions,
			) =>
				Effect.gen(function* (_) {
					const element = yield* _(querySelector(selector));

					return yield* _(
						tryPromiseWrapp(
							() =>
								hero.activeTab.waitForElement(element, {
									timeoutMs: waitExistsTimeoutMs,
									...options,
								}),
							"queryElement",
						),
					);
				});

			const waitForExists = (
				selector: string,
				options?: IWaitForElementOptions,
			) =>
				tryPromiseWrapp(
					() =>
						hero.document.querySelector(selector).$waitForExists({
							timeoutMs: waitExistsTimeoutMs,
							...options,
						}),
					"waitForExists",
				);

			const isVisible = (selector: string) =>
				Effect.gen(function* (_) {
					const element = yield* _(querySelector(selector));

					return yield* _(
						tryPromiseWrapp(
							async () => (element ? await element.$isVisible : false),
							"isVisible",
						),
					);
				});

			const waitForContentLoaded = (setPageReady = true) =>
				Effect.gen(function* (_) {
					const isContentLoaded = yield* _(isAllContentLoaded());

					if (!isContentLoaded) {
						yield* _(
							tryPromiseWrapp(
								() =>
									hero.activeTab.waitForLoad("AllContentLoaded", {
										timeoutMs: waitExistsTimeoutMs,
									}),
								"waitForLoad",
							),
						);
					}

					const isPaintingStable = yield* _(
						tryPromiseWrapp(
							() => hero.activeTab.isPaintingStable,
							"isPaintingStable",
						),
					);

					if (!isPaintingStable) {
						yield* _(
							tryPromiseWrapp(
								() =>
									hero.activeTab.waitForPaintingStable({
										timeoutMs: waitExistsTimeoutMs,
									}),
								"waitForPaintingStable",
							),
						);
					}

					if (setPageReady) {
						const currentUrl = yield* _(url());

						yield* _(
							Ref.set(isPageReady, useValidURL(currentUrl) instanceof URL),
						);
					}
				});

			const reload = () =>
				Effect.gen(function* (_) {
					yield* _(Ref.set(isPageReady, false));

					yield* _(
						tryPromiseWrapp(
							() =>
								hero.reload({
									timeoutMs: waitExistsTimeoutMs,
								}),
							"reload",
						),
					);

					yield* _(waitForContentLoaded());
				});

			const clickElement = (
				selector: string,
				queryOptions?: IWaitForElementOptions,
			) =>
				Effect.gen(function* (_) {
					const element = yield* _(queryElement(selector, queryOptions));

					return yield* _(
						tryPromiseWrapp(
							() =>
								hero.interact({
									click: { element, verification: "exactElement" },
								}),
							"interact",
						),
					);
				});

			const typeInput = (
				selector: string,
				content: string,
				queryOptions?: IWaitForElementOptions,
			) =>
				Effect.gen(function* (_) {
					const element = yield* _(queryElement(selector, queryOptions));

					return yield* _(
						tryPromiseWrapp(
							() =>
								hero.interact({
									click: { element, verification: "exactElement" },
									type: content,
								}),
							"interact",
						),
					);
				});

			const close = () => tryPromiseWrapp(() => hero.close(), "close");

			return {
				goto,
				// goto: gotoBase,
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
