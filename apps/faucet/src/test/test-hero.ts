import type { THeroAppOptions } from "@scraper/hero";
import ExecuteJsPlugin from "@ulixee/execute-js-plugin";
import Hero from "@ulixee/hero";

import { Context, Effect, Layer } from "effect";
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

type Test<T extends keyof HeroProps> = Pick<HeroProps, T>;

type FooReturnType<T extends keyof HeroProps> = ReturnType<Test[T]>;

type TestGoto = ReturnType<Test<"goto">["goto"]>;

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
					try: () =>
						new Hero({
							/* всі opts.* тут, включно з cookies */
						}),
					catch: (cause) =>
						new HeroError({
							module: "HeroAppService",
							method: "init",
							cause,
						}),
				}),
			);

			hero.use(ExecuteJsPlugin);

			// const activeTab =

			return {
				// Navigation methods
				goto: (href, options) =>
					Effect.tryPromise({
						try: () => hero.goto(href, options),
						catch: (cause) =>
							new HeroError({
								module: "HeroAppService",
								method: "goto",
								cause,
							}),
					}),
				waitForMillis: (millis) =>
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
