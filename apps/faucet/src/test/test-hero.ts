import { STATUS_CODES } from "node:http";
import { HeroAppService } from "@scraper/hero";
import { IpInfoService } from "@scraper/ip-info";
import { getUserWithCookies } from "@scraper/prisma";
import Hero from "@ulixee/hero/lib/Hero";
import type Resource from "@ulixee/hero/lib/Resource";
import { Console, Data, Effect } from "effect";
import type { HeroParametersType } from "../../../../packages/hero/src/HeroAppService";
import {
	HeroClientService,
	HeroClientServiceLive,
} from "../../../../packages/hero/src/HeroClient";

// Users array should be defined somewhere
declare const users: Array<{
	baseUrl: string;
	cookies?: any;
	// інші поля THeroAppOptions
}>;

const username = "abbey74@vsokolyk.pp.ua";

const user = await getUserWithCookies(username);

export const program = Effect.gen(function* ($) {
	const app = yield* $(HeroClientService);

	const url = new URL("https://bun.vsokolyk.pp.ua/test-errors.php");

	url.searchParams.set("error", "403");

	// yield* app.goto("https://httpbin.org/status/403");
	yield* app.goto(url.toString());
	// yield* app.handleTurnstileChallenge();
}).pipe(Effect.catchAll(Console.error));

Effect.runFork(
	program.pipe(
		Effect.provide(HeroClientService.Default),
		Effect.provide(HeroAppService.Default),
		Effect.provide(IpInfoService.Default),
	),
);

// const hero = new Hero({
// 	userAgent: "~ chrome >= 136 && mac",
// 	connectionToCore: {
// 		host: "ws://localhost:1818",
// 	},
// 	showChrome: true,
// 	showDevtools: true,
// });

// const url = "https://bun.vsokolyk.pp.ua/test-errors.php?error=403";

// const res = await hero.goto(url.toString());

// let pageResponseHeaders: Headers | Map<string, string> | undefined;

// try {
// 	pageResponseHeaders = new Headers(res.response.headers);
// } catch (e) {
// 	pageResponseHeaders = new Map(
// 		Object.entries(res.response.headers as Record<string, string>),
// 	);
// }

// console.log(pageResponseHeaders);

// await hero.close();

// declare const userDetails: Effect.Effect<
// 	never,
// 	NegativeAgeError | UnderageError | NameError,
// 	{ age: number; name: string }
// >;

// const handled = userDetails.pipe(
// 	Effect.match({
// 		onFailure: () => ({ age: 0, name: "Anonymous" }),
// 		onSuccess: (x) => x,
// 	}),
// ); // :: Effect<never, never, { age: number, name: string }>

// // equivalent to:
// const handled2 = userDetails.pipe(
// 	Effect.matchEffect({
// 		onFailure: () => Effect.succeed({ age: 0, name: "Anonymous" }),
// 		onSuccess: Effect.succeed,
// 	}),
// );
