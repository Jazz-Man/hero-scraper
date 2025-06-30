import HeroApp from "@scraper/hero";

console.time("FreeBitco");

let app: HeroApp | undefined;

try {
	app = new HeroApp({
		baseUrl: "https://bun.vsokolyk.pp.ua",
		createOptions: {
			showChrome: true,
			showDevtools: true,
		},
	});

	const hero = await app.getHero();

	await app.goto("https://bun.vsokolyk.pp.ua");

	const url = await hero.url;
	const cookies = await app.exportCookies();

	console.log({ cookies, url });

	const profile = await hero.exportUserProfile();

	console.log(profile);

	// await app.close();
} catch (e) {
	// await app?.close();
	console.error(e instanceof Error ? e.toString() : String(e));
}

console.timeLog("FreeBitco");

// console.log('end');
