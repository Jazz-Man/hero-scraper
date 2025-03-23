import { getUserWithCookies } from "@scraper/prisma";
import FreeBitco from "../faucets/FreeBitco.ts";

(async () => {
	try {
		const username = "alexanne58@mailcloud.pp.ua";

		const user = await getUserWithCookies(username);

		const app = new FreeBitco(user);

		await app.initFaucet();
		await app.login();

		const response = await app.getCurrentAddressAndBalance();

		console.log(response);

		await app.saveProfileCookies();
	} catch (e) {
		console.error(e);
	}
})();
