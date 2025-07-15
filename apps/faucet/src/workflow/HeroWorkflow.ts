import { getUserWithCookies } from "@scraper/prisma";
import { DateTime, Effect } from "effect";

const timeZone = "Europe/Kyiv";

const username = "abbey74@vsokolyk.pp.ua";

const user = await getUserWithCookies(username);

const program = Effect.gen(function* () {
	const now = yield* DateTime.now;

	const nowDate = DateTime.toDate(now);

	const tZone = DateTime.zoneUnsafeMakeNamed(timeZone);

	const cookies = user.cookies.map((cookie) => {
		const expires = cookie.expires ? DateTime.unsafeMake(cookie.expires) : now;

		const expiresNow = DateTime.setParts(expires, {
			year: nowDate.getUTCFullYear(),
		});

		const utc = DateTime.add(expiresNow, { years: 1 });

		const zoned = DateTime.setZone(utc, tZone);

		cookie.expires = DateTime.toDate(zoned);

		return cookie;
	});

	console.log(cookies);

	return cookies;
});

Effect.runFork(program);
