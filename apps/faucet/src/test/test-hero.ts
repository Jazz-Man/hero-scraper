import { HeroAppService, HeroClientService } from "@scraper/hero";
import { IpInfoService } from "@scraper/ip-info";
import { getUserWithCookies } from "@scraper/prisma";

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
	// const url = new URL(
	// 	"https://dashboard.hcaptcha.com/signup?type=accessibility",
	// );
	const url = new URL("https://cointiply.com/login");
	// const url = new URL("https://wtfismyip.com");

	// url.searchParams.set("op", "home");

	yield* app.goto(url.toString());

	yield* app.setCookie(
		"hc_accessibility",
		"OLxv/7uKsfRJcUu6MGG8uMfFWOwBdrJvyhRj6I86zfiioOzW/4JALGw6VU9oHJ+sxBc/HO9z5TnHt/2ATXDAbR7wURx0O23SphUF5Xpz6q2VFxnGibTmdAta/T8kWJkY2QS2cgwudzZpBejDxDJvc7ajXjxBjSYkrotZAw1BOnktyFcnWOQjzEJuqixLS+U6ZyZWgCCUtJrUdo6t2IgbVjnb06A9SqeP82VhURVsZOlhz1/3iK9gYyb0NGsOxzDy6uyrnuCBQngTpOFBN0R4xS2crwXCdwN1tGFN7MGBZgpFIG8JPG99m5lLjw4of+Dii9lKNczklh9msySwvVqQh8hNk+uCErWFvdG3GOvjKI78uHf3X4u4MPmTYzntjTSoNLv0RkFYleJMj4Z/FoHfCrnLXWZgqQFJkFfRNLUqC06Y/EWxps0ZNM5DTgTSVVO25n91KdAn6yy8C2j3SLK8SIGbVt9aEyD8kECouSGmG1QiVgXCfiYnJh/1umdMUs0NoYEueBgBFDkYTNDd+fn0mPRdlc3K4B3BSaX3eNXVQGjl3DFgW91mEq/dkVM2ivJECKOix7KH1sNAn++PKUwHwlbbVI9zlu5ahqgjfSZ2Zz5k2hKFfrZQgYrp01/UYWYdwKH1GPiEmQWh1n5t/Wf4d/QF0UhK1QDUQ3Q3Zc1x9lWk0AryJOsELX91E1j6XcDEwTrb6uZl2nmix3GuC5RuW2J5WzKPGnoVGiZiPzlH9DDIsDwksyD05Y126NcMDiwlZLr9hrnvYkZ/+NSrnr7Vs+t3YCZhyJEBt7XOfO+is7vM0RwhUXj1CqE27GruOyDtzQHiA/4xb9qyW/fl+q5e/q0tnOgSWzo2hV67Zlb+Df3Eo3t1nVsEhcJRAx0GyPoKdrhzUD/+jE0U7iy2Vo00I3I6wDJPRyFjMywKR3t/mYO4tCIYOmJElYrC0WCRFeefdL9rA1U0c7RhI3ue1V1Rn1B2vZWQpehB7qzX2flRXNkr2N/YXRq20g+92uXcDgyqKpvDRTbY2488t5ApG9Apbvx3bgaNPcHWUjEy4w==6aemkZu7F31NfqHZ",
		{
			domain: ".hcaptcha.com",
			secure: true,
			httpOnly: false,
			path: "/",
			sameSite: "None",
		},
	);

	yield* app.reload();

	yield* app.typeInput(
		'.auth-form input[id="email_field"]',
		"lark.presets_00@icloud.com",
	);
	yield* app.typeInput(
		'.auth-form input[id="password_field"]',
		"tensIg-zuwjo1-jyjciq",
	);

	yield* app.clickElement(
		'//form[@class="auth-form"]//a[contains(@class,"captcha-option") and contains(text(), "hCaptcha")]',
		true,
	);

	// console.log(yield* Effect.tryPromise(() => _token.textContent));

	// console.log(
	// 	yield* app.fetch("https://wtfismyip.com/json", {
	// 		mode: "no-cors",
	// 		referrerPolicy: "no-referrer",
	// 	}),
	// );

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
