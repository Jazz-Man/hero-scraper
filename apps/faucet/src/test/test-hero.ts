import type { THeroAppOptions } from "@scraper/hero";
import type {
	IRequestInfo,
	IRequestInit,
} from "@ulixee/awaited-dom/base/interfaces/official";
import ExecuteJsPlugin from "@ulixee/execute-js-plugin";
import Hero from "@ulixee/hero";
import type { ILocationTrigger } from "@ulixee/unblocked-specification/agent/browser/Location";
import { Context, Effect, Layer, Ref } from "effect";
import { HeroError } from "../errors/HeroError";

type UnwrapPromise<T> = T extends Promise<infer U>
	? U
	: T extends (...args: any) => Promise<infer U>
		? U
		: T extends (...args: any) => infer U
			? U
			: T;

type ClassProperties<Class> = {
	[Prop in keyof Class as Prop extends symbol
		? never
		: Prop]: Class[Prop] extends (...args: any[]) => any
		? (
				...args: Parameters<Class[Prop]>
			) => Effect.Effect<UnwrapPromise<ReturnType<Class[Prop]>>, HeroError>
		: Effect.Effect<UnwrapPromise<Class[Prop]>, HeroError>;
};

type HeroProps = ClassProperties<Hero>;

type AllProps = keyof HeroProps;

type ParametersType<T extends AllProps> = Pick<HeroProps, T>[T];

class HeroAppService extends Context.Tag("HeroAppService")<
	HeroAppService,
	Pick<HeroProps, "goto" | "querySelector" | "waitForMillis">
>() {}

export const HeroAppServiceLive = (opts: THeroAppOptions) =>
	Layer.effect(
		HeroAppService,
		Effect.gen(function* ($) {
			const hero = yield* $(
				Effect.try({
					try: () => new Hero(opts.createOptions),
					catch: (cause) =>
						new HeroError({
							module: "HeroAppService",
							method: "init",
							cause,
						}),
				}),
			);

			hero.use(ExecuteJsPlugin);

			const tryPromise = <A>(
				fn: (signal: AbortSignal) => PromiseLike<A>,
				method: AllProps,
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

			const goto = (...params: Parameters<ParametersType<"goto">>) =>
				tryPromise(() => hero.goto(...params), "goto");

			return {
				goto,
				waitForMillis: (millis = 1000) =>
					Effect.tryPromise({
						try: () => hero.waitForMillis(millis),
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "waitForMillis",
								cause,
							}),
					}),
				querySelector: (selector) =>
					Effect.try({
						try: () => hero.querySelector(selector),
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "goto",
								cause,
							}),
					}),

				waitForNavigation: (
					trigger: ILocationTrigger = "change",
					setPageReady = true,
				) =>
					Effect.tryPromise({
						try: async () => {
							if (setPageReady) {
								// this.isPageReady = false;
							}

							await hero.waitForLocation(trigger, {
								// timeoutMs: this.timeoutMs,
							});

							return "";
						},
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "getAllCookies",
								cause,
							}),
					}),

				getAllCookies: () =>
					Effect.tryPromise({
						try: () => hero.activeTab.cookieStorage.getItems(),
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "getAllCookies",
								cause,
							}),
					}),

				getCookie: (key: string) =>
					Effect.tryPromise({
						try: () => hero.activeTab.cookieStorage.getItem(key),
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "getCookie",
								cause,
							}),
					}),

				deleteCookie: (key: string) =>
					Effect.tryPromise({
						try: () => hero.activeTab.cookieStorage.removeItem(key),
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "deleteCookie",
								cause,
							}),
					}),

				setCookie: (name: string, value: string) =>
					Effect.tryPromise({
						try: () => hero.activeTab.cookieStorage.setItem(name, value),
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "getCookie",
								cause,
							}),
					}),

				fetch: (input: IRequestInfo, init?: IRequestInit) =>
					Effect.tryPromise({
						try: () => {
							const request = new hero.Request(input, {
								credentials: "include",
								mode: "cors",
								referrerPolicy: "strict-origin-when-cross-origin",
								redirect: "follow",
								...init,
							});

							return hero.fetch(request);
						},
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "fetch",
								cause,
							}),
					}),
			};
		}),
	);

// Users array should be defined somewhere
declare const users: Array<{
	baseUrl: string;
	cookies?: any;
	// інші поля THeroAppOptions
}>;

export const program = Effect.gen(function* ($) {
	const hero = yield* $(HeroAppService);

	yield* $(hero.goto("https://example.com"));
	yield* $(hero.waitForContentLoaded());

	// Натискаємо на певний селектор (опціонально)
	const selector = "#startButton";
	const button = yield* $(hero.querySelector(selector));
	yield* $(hero.interact({ click: button }));

	// Чекаємо, можливо, після натиску
	yield* $(hero.waitForContentLoaded());

	// Експортуємо куки
	const cookies = yield* $(hero.exportCookies());
	console.log("Cookies exported:", cookies);

	// Закінчуємо сесію
	yield* $(hero.close());
});

// Приклад використання
for (const user of users) {
	const layer = HeroAppServiceLive({
		baseUrl: user.baseUrl,
		profileCookies: user.cookies,
		// інші поля THeroAppOptions
	});

	Effect.runPromise(
		program.pipe(Effect.provide(layer)).catch((e) => console.error(e)),
	);
}
