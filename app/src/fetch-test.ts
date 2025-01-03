import getHero from './hero.ts';

(async () => {
  try {
    const hero = await getHero({
      showChrome: true,
      showDevtools: true
    });

    await hero.goto('https://freebitco.in');
    await hero.waitForPaintingStable();
    await hero.waitForLoad('AllContentLoaded');

    const { Request, fetch } = hero;

    const cookieStorage = hero.activeTab.cookieStorage;

    const csrf_token = await cookieStorage.getItem('csrf_token');

    console.log({ csrf_token: csrf_token.value });

    const email = `x${Math.floor(Math.random() * 100000)}x@freeicloud.com`;

    function generateTestPassword() {
      const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let password = '';
      const length = 8; // Мінімальна довжина пароля

      for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      return password;
    }

    const params = new URLSearchParams();
    params.append('csrf_token', csrf_token.value);
    params.append('op', 'login_new');
    params.append('btc_address', email);
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
