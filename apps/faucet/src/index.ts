import { getUserWithCookies } from "@scraper/prisma";
import FreeBitco from "./faucets/FreeBitco";

try {
	const username = "aaliyah_huels@mailcloud.pp.ua";

	const user = await getUserWithCookies(username);

	const faucet = new FreeBitco(user);

	await faucet.initFaucet();

	await faucet.login();
	// await faucet.signup();

	await faucet.saveProfileCookies();
} catch (e) {
	console.error(e);
}
