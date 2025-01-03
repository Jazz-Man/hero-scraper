import Path from 'path';
import App from './App.ts';

import { safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import getOtp from './otp.ts';

(async () => {
  try {
    const app = new App('username', 'password', true);

    await app.init({
      showChrome: true,
      showDevtools: true
    });

    const profilePath = Path.join(__dirname, '../../.tmp/profile-test.json');

    await app.goto('https://freebitco.in');

    await app.initCookie();

    await app.reload();

    const tfa_code = getOtp('SWDCEBDMWSWGGVMS');

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

    const loginStatus = await app.ajaxPost('/', {
      op: 'login_new',
      btc_address: email,
      password: generateTestPassword(),
      // password: 'jawheT-wiwsuc-7padpa',
      tfa_code
    });

    console.log(await loginStatus.text());
    //
    // const [status, ...loginData] = loginStatus.split(':');
    //
    // if (status !== 's') {
    //   throw new Error(loginData[0]);
    // }
    //
    // const [btc_address, password, fbtc_userid, fbtc_session] = loginData;
    //
    // await app.setCookie('btc_address', btc_address, {
    //   expires: 3650,
    //   secure: true
    // });
    // await app.setCookie('password', password, {
    //   expires: 3650,
    //   secure: true
    // });
    // await app.setCookie('fbtc_userid', fbtc_userid, {
    //   expires: 3650,
    //   secure: true
    // });
    // await app.setCookie('fbtc_session', fbtc_session, {
    //   expires: 3650,
    //   secure: true
    // });
    // await app.setCookie('have_account', '1', {
    //   expires: 3650,
    //   secure: true
    // });
    //
    // console.log({
    //   btc_address,
    //   password,
    //   fbtc_userid,
    //   fbtc_session,
    //   loginData
    // });
    //
    // await app.goto('https://freebitco.in/?op=home');

    const theStoredProfile = await app.exportUserProfile();

    await safeOverwriteFile(
      profilePath,
      TypeSerializer.stringify(theStoredProfile)
    );

    const meta = await app.getMeta();

    // await hero.waitForMillis(10000); // waits 5 seconds

    // await app.hero.close();

    return meta;
  } catch (e) {
    throw e;
  }
})()
  .then((res) => console.log(res))
  .catch((e) => console.error(e));
