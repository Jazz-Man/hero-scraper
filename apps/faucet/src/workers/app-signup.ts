import type { TUsersWithCookies } from "@scraper/prisma";
import { expose } from "threads/worker";
import type { TWorkerResult } from "../@types";
import FreeBitco from "../faucets/FreeBitco.ts";

const appSignup = async (user: TUsersWithCookies): Promise<TWorkerResult> => {
	return new Promise(async (resolve, reject) => {
		console.time("FreeBitco");

		let app: FreeBitco | undefined = undefined;

		try {
			app = new FreeBitco(user);

			await app.initFaucet();

			await app.login();
			// await app.signup('54942375');

			const cookies = await app.getProfileCookies();

			await app.hero.close();

			resolve({ cookies, username: user.username });
		} catch (e) {
			await app?.hero.close();

			if (e instanceof Error) {
				console.error(e.toString());
			} else {
				console.error(e);
			}
		}

		console.timeEnd("FreeBitco");

		resolve({ cookies: [], username: user.username });
	});
};

expose(appSignup);

export type TAppSignup = typeof appSignup;
