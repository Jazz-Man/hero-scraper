import { BunContext, BunRuntime } from "@effect/platform-bun";

import {
	HeroAppService,
	HeroAppServiceLive,
	HeroError,
	type THeroAppOptions,
} from "@scraper/hero";
import { getUserWithCookies } from "@scraper/prisma";
import type {
	IRequestInfo,
	IRequestInit,
} from "@ulixee/awaited-dom/base/interfaces/official";

import Hero from "@ulixee/hero/lib/Hero";
import type { ILocationTrigger } from "@ulixee/unblocked-specification/agent/browser/Location";
import { Console, Context, Effect, Layer, Ref } from "effect";

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

class HeroAppServiceTest extends Context.Tag("HeroAppServiceTest")<
	HeroAppServiceTest,
	Pick<HeroProps, "goto" | "querySelector" | "waitForMillis">
>() {}

export const HeroAppServiceTestLive = (opts: THeroAppOptions) =>
	Layer.effect(
		HeroAppServiceTest,
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

const username = "abbey74@vsokolyk.pp.ua";

const user = await getUserWithCookies(username);

export const program = Effect.gen(function* ($) {
	const app = yield* $(HeroAppService);

	const hero = yield* $(
		app.getHero(
			{
				showChrome: true,
				showDevtools: true,
			},
			user.cookies,
			new URL("https://freebitco.in/"),
		),
	);

	return yield* $(
		Effect.tryPromise({
			try: () => hero.goto("https://freebitco.in/?op=home"),
			catch: (res) => new Error(`Goto error: ${res}`),
		}),
	);
}).pipe(Effect.catchAll(Console.error));

Effect.runFork(program.pipe(Effect.provide(HeroAppServiceLive)));
// const runnable = Effect.provide(program, HeroAppServiceLive);

// Effect.runPromise(program).then(Console.log).catch(Console.error);
//
// const failure = Effect.fail("Uh oh!");

// BunRuntime.runMain(failure);
// BunRuntime.runMain(program.pipe(Effect.provide(HeroAppServiceLive)), {
// 	disableErrorReporting: false,
// });

// BunRuntime.runMain(runnable.pipe(Effect.provide(BunContext.layer)));

// BunRuntime.runMain(
// 	program.pipe(
// 		Effect.provide(HeroAppServiceLive),
// 		Effect.provide(BunContext.layer),
// 	),
// );

// Effect.runPromise(runnable).catch(console.error);

// Effect.runPromise(program.pipe(Effect.provide(HeroAppService.Default)));

// Приклад використання
// for (const user of users) {
// 	const layer = HeroAppServiceLive({
// 		baseUrl: user.baseUrl,
// 		profileCookies: user.cookies,
// 		// інші поля THeroAppOptions
// 	});

// 	Effect.runPromise(
// 		program.pipe(Effect.provide(layer)).catch((e) => console.error(e)),
// 	);
// }
