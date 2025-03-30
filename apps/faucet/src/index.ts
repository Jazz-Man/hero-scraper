import { getUserWithCookies } from "@scraper/prisma";
import FreeBitco from "./faucets/FreeBitco";

try {
	const username = "abbey74@vsokolyk.pp.ua";

	const user = await getUserWithCookies(username);

	const faucet = new FreeBitco(user);

	await faucet.initFaucet();

	await faucet.login();

	// await faucet.signup("55119070");

	await faucet.configureAccount();
	await faucet.saveProfileCookies();
} catch (e) {
	console.error(e);
}
