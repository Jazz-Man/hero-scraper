import getHero from './hero.ts';
import {
  generateTestEmail,
  generateTestPassword
} from './utils/random-data.ts';

(async () => {
  try {
    const hero = await getHero({
      showChrome: true,
      showDevtools: true
    });

    const urlBefore = await hero.url;

    await hero.goto('https://freebitco.in');
    await hero.waitForPaintingStable();
    await hero.waitForLoad('AllContentLoaded');

    const urlAfter = await hero.url;

    console.log({ urlBefore, urlAfter });

    const { Request, fetch } = hero;

    const cookieStorage = hero.activeTab.cookieStorage;

    const csrf_token = await cookieStorage.getItem('csrf_token');
    const csrf_token_test = await cookieStorage.getItem('csrf_token_test');

    console.log({ csrf_token: csrf_token.value, csrf_token_test });

    const params = new URLSearchParams();
    params.append('csrf_token', csrf_token.value);
    params.append('op', 'login_new');
    params.append('btc_address', generateTestEmail());
    params.append('password', generateTestPassword());
    params.append('tfa_code', '123456');

    const request = new Request('/', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-csrf-token': csrf_token.value
      },
      body: params.toString()
    });

    const response = await fetch(request);

    const data = await response.text();
    console.log({ data });
  } catch (e) {
    console.error(e);
  }
})();
