import { HeroAppService, HeroClientService } from "@scraper/hero";
import { IpInfoService } from "@scraper/ip-info";
import { getUserWithCookies } from "@scraper/prisma";
import ExecuteJsPlugin from "@ulixee/execute-js-plugin";
import Hero from "@ulixee/hero/lib/Hero";
import type Resource from "@ulixee/hero/lib/Resource";

// const HeroCore = require("@ulixee/hero-core");

import { Console, Effect } from "effect";

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

	// const url = new URL("https://bun.vsokolyk.pp.ua");
	// const url = new URL("https://freebitco.in");
	const url = new URL("https://cointiply.com");

	// url.searchParams.set("op", "home");

	yield* app.goto(url.toString());

	const cookies = yield* app.getAllCookies();

	const _token = yield* app.xpathSelector("//li[@class='active']", true);

	console.log(yield* Effect.tryPromise(() => _token.textContent));

	// yield* app.close();
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

// // const url = "https://cointiply.com";

// // await hero.activeTab.on("resource", async (resource) => {
// // 	console.log(resource);
// // });

// const res = await hero.goto("https://cointiply.com");

// HeroCore.use(ExecuteJsPlugin);

// (async () => {
// 	const hero = new Hero({
// 		connectionToCore: {
// 			host: "ws://localhost:1818",
// 		},
// 		showChrome: true,
// 		showDevtools: true,
// 		disableMitm: false,
// 	});

// 	// hero.use(ExecuteJsPlugin);

// 	// const resources: Resource[] = [];
// 	// hero.activeTab.on("resource", (event) => resources.push(event as any));

// 	const url = new URL("https://cointiply.com");

// 	// url.searchParams.set("error", "403");

// 	await hero.goto(url.toString());
// 	await hero.waitForPaintingStable();
// 	// console.log("Page loaded");

// 	const elements = await hero.activeTab.xpathSelectorAll(
// 		"//input[@name='_token']",
// 		true,
// 	);
// 	console.log(await elements.length);
// 	// console.log("Done");

// 	// const lastCommandId = await hero.activeTab.lastCommandId;

// 	// const res = await hero.waitForResource(
// 	// 	{
// 	// 		type: "Document",
// 	// 	},
// 	// 	{
// 	// 		timeoutMs: 30,
// 	// 		throwIfTimeout: true,
// 	// 	},
// 	// );
// 	// console.log(res);

// 	// console.log(hero, hero.tabs, hero.activeTab);
// 	// await hero.waitForPaintingStable();
// 	// await hero.waitForLoad("AllContentLoaded");
// 	// await hero.reload();
// })();
