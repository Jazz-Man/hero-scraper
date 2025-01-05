import App from './App.ts';

import getOtp from './otp.ts';

(async () => {
  try {
    const app = new App(
      'rider_64paleo@icloud.com',
      'jawheT-wiwsuc-7padpa',
      true
    );

    await app.init({
      showChrome: true,
      showDevtools: true
    });

    await app.goto('https://freebitco.in/?op=home');

    await app.initCookie();

    try {
      const tfa_code = getOtp('SWDCEBDMWSWGGVMS');

      await app.login(tfa_code);
    } catch (e) {
      console.error(e);
    }

    await app.saveProfileCookies();

    const meta = await app.hero.meta;

    return meta;
  } catch (e) {
    throw e;
  }
})()
  .then((res) => console.log(res))
  .catch((e) => console.error(e));
