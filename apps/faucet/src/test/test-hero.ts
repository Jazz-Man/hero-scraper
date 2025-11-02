import { HeroAppService, HeroClientService } from "@scraper/hero";
import { IpInfoService } from "@scraper/ip-info";
// import { getUserWithCookies } from "@scraper/prisma";

import { Console, Effect } from "effect";

// Users array should be defined somewhere
declare const users: Array<{
	baseUrl: string;
	cookies?: any;
	// інші поля THeroAppOptions
}>;

const username = "abbey74@vsokolyk.pp.ua";

// const user = await getUserWithCookies(username);

export const program = Effect.gen(function* ($) {
	const app = yield* $(HeroClientService);

	// const url = new URL(
	// 	"https://dashboard.hcaptcha.com/signup?type=accessibility",
	// );
	const url = new URL("https://cointiply.com/login");

	yield* app.goto(url.toString());

	yield* app.setCookie(
		"hc_accessibility",
		"pEW9HJfWmKPPOxdoAmALXNvEyhI5V1fuZKPZU9eP/O/Jx27jlw0BT1BcCX+133olevBRembldyxPNudvfd34iz5Nd+S9E9UbV+KOz+HDxEQlg95YgNYhygZKAPvsoHeNJOnMO3wsbsQGr8SSuGCyrrYTuIz2BAsVwfthq/T/+1WjF2wJlJeXRilVER0J2ps0bKhKBNuHIPkWONTemGhDqXe3CNdOI9Omzc6kT9dNZmP9OdlBu/AEiDYYFO4VP9ngPIMpaHKw2HUt4YVOksAG5nXmdKyZ9sXdkB6FN6/T/ipqT6lYpwJigfmoV4siYuG440Z7fJ1eg+fyAx8ha0W6OJJfY7nBKUszvgRyshw7EvVzTzRdhQy6Q1FmXICANwkPL/EdOZxl7Qu0a+OjmR/MrIlLTGRzuZarrsLdAE1qN9TNmQkKfvirF3tKHlvpIhNdNymqsxCi6f4vak0ZFJRbHIfHgHKjxLaQxQX3sS5b8VwVaJH6ae0pYgKmDW6m6Bg5Wei1RbDyPWtHdELZTvV7tj0bHirw17+U8UaaPDmBxFv/khGJ33jOqozuj+CQKLnqSlFhg1MKDwZik4z6qmKU9v6se7wZpaCBxYQkzlP13udu+26jMxKavy9J6r8V5e/zX6bfUdyjTnWrJCl48+4m6bWBLcLkBEij2obCvnZsquG1uCzOk1H7+KUOGVhxubNhrf1C5cfLMuh3qD3PBmLG3EBKaeT+xs6N3ptnhVqMcs3SB3+ueMjWos6V6KpQ3sJ2M1AHhM7wH7hhRJfx7VZIXadjFVmpmFn2ZGueL1MpR6XzbUVRRwVqs+f6F/OOIWPmSbzMpVPbC37CFqk8tEHRUPzVhSAYHQvrgdXdGDP4wRUMUcbVFGd4V9WMUjq2sXOf/lPHcVWaXMx21E6HnQcHFecH6Eq2uP00O2H9dmgCoLHlIBkuNQPEK3am/VIFBOD80dbeh0HadNTPi9rbeiH+oQ941/W2tzVa/UEj/bwjfakkgnsa7QbYLSGE9toKVN71FKMwoxIxX3KwPi6yoDsoxg==x/3hNjMQEtYgXnci",
		{
			domain: ".hcaptcha.com",
			secure: true,
			httpOnly: false,
			path: "/",
			sameSite: "None",
		},
	);

	yield* app.reload();

	// yield* app.typeInput(
	// 	'.auth-form input[id="email_field"]',
	// 	"lark.presets_00@icloud.com",
	// );
	// yield* app.typeInput(
	// 	'.auth-form input[id="password_field"]',
	// 	"tensIg-zuwjo1-jyjciq",
	// );

	// yield* app.clickElement(
	// 	'//form[@class="auth-form"]//a[contains(@class,"captcha-option") and contains(text(), "hCaptcha")]',
	// 	true,
	// );

	// const iframe = yield* app.getIFrameEnvironment(
	// 	'//form[@class="auth-form"]//div[contains(@id,"h-captcha")]/iframe',
	// 	true,
	// );

	// const checkbox = iframe.querySelector("#anchor");

	// checkbox.$isClickable.then((isClickable) => {
	// 	checkbox.$click();
	// });
}).pipe(Effect.catchAll(Console.error));

Effect.runFork(
	program.pipe(
		Effect.provide(HeroClientService.Default),
		Effect.provide(HeroAppService.Default),
		Effect.provide(IpInfoService.Default),
	),
);
