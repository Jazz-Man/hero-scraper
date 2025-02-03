import { getUserWithCookies } from '@scraper/db';
import HeroApp from './hero';

try {
  const user = await getUserWithCookies('brooklyn45@mailcloud.pp.ua');

  const app = new HeroApp(
    'https://freebitco.in/?op=home',
    {
      showChrome: true,
      showDevtools: true
    },
    user?.cookies
  );

  console.log(user);

  const hero = await app.getHero();

  await hero.goto('https://freebitco.in/?op=home');

  const timeout = 30000;

  await hero.waitForLoad('AllContentLoaded', {
    timeoutMs: timeout
  });

  await hero.waitForPaintingStable({
    timeoutMs: timeout
  });

  await hero.waitForMillis(5000);

  // const cookies = await app.exportCookies();
  //
  // console.log(cookies, app.cookiesDomain);

  // await hero.close();
} catch (e) {
  console.error(e);
}
