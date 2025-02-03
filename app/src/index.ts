import { getUserWithCookies } from '@scraper/db';
import FreeBitco from './faucets/FreeBitco.ts';

try {
  const username = 'brooklyn45@mailcloud.pp.ua';

  const user = await getUserWithCookies(username);

  const faucet = new FreeBitco(user);

  await faucet.initFaucet();

  await faucet.login();
  // await app.signup();

  await faucet.app.handleTurnstileChallenge();

  await faucet.saveProfileCookies();
} catch (e) {
  console.error(e);
}
