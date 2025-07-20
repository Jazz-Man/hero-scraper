import { HeroAppService } from "@scraper/hero";
import { IpInfoService } from "@scraper/ip-info";
import { getUserWithCookies } from "@scraper/prisma";

import Hero from "@ulixee/hero/lib/Hero";
import type Resource from "@ulixee/hero/lib/Resource";
import { Console, Effect } from "effect";

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

	// yield* app.goto("https://httpbin.org/status/403");
	yield* app.goto("https://bun.vsokolyk.pp.ua");
	// yield* app.reload();

	// const hero = yield* $(
	// 	app.getHero(
	// 		{
	// 			showChrome: true,
	// 			showDevtools: true,
	// 		},
	// 		user.cookies,
	// 		new URL("https://freebitco.in/"),
	// 	),
	// );

	// return yield* $(
	// 	Effect.tryPromise({
	// 		try: () => hero.goto("https://freebitco.in/?op=home"),
	// 		catch: (res) => new Error(`Goto error: ${res}`),
	// 	}),
	// );
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
// });

// const url = "https://bun.vsokolyk.pp.ua";

// const res = await hero.goto(url);

// let pageResponseHeaders: Headers | Map<string, string> | undefined;

// try {
// 	pageResponseHeaders = new Headers(res.response.headers);
// } catch (e) {
// 	pageResponseHeaders = new Map(
// 		Object.entries(res.response.headers as Record<string, string>),
// 	);
// }

// console.log(pageResponseHeaders.get("server"));

// await hero.close();
