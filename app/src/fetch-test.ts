import type { TUser } from './@types';
import App from './App.ts';
import {
  generateTestEmail,
  generateTestPassword
} from './utils/random-data.ts';

(async () => {
  try {
    const generateUser: TUser = {
      username: generateTestEmail(),
      password: generateTestPassword(),
      tfa_secret: 'HXAZUGRYZXCG2K6N'
    };

    const app = new App(generateUser.username, generateUser.password);

    await app.init({
      showChrome: true,
      showDevtools: true
    });

    await app.goto('https://freebitco.in/?op=home');

    await app.initCookie();

    const { Request, fetch } = app.hero;

    const cookieStorage = app.hero.activeTab.cookieStorage;

    const csrf_token = await cookieStorage.getItem('csrf_token');
    const csrf_token_test = await cookieStorage.getItem('csrf_token_test');

    console.log({ csrf_token: csrf_token.value, csrf_token_test });

    const params = new URLSearchParams();
    params.append('csrf_token', csrf_token.value);
    params.append('op', 'login_new');
    params.append('btc_address', generateUser.username);
    params.append('password', generateUser.password);
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
