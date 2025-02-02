import { getUserWithCookies } from '@scraper/db';
import { expose } from 'threads/worker';
import type { TWorkerProxyUser, TWorkerResult } from '../@types';
import FreeBitco from '../FreeBitco.ts';

const appSignup = async (_user: TWorkerProxyUser): Promise<TWorkerResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await getUserWithCookies(_user.username);

      const app = new FreeBitco('https://freebitco.in/?op=home', user);

      await app.init(
        {
          showChrome: true,
          showDevtools: true
        },
        user.cookies
      );

      await app.goto('https://freebitco.in/?op=home');

      await app.initCookie();

      // const tfa_code = getOtp(user.tfa_secret as string);

      await app.signup('54827183');

      // await app.login(tfa_code);

      const cookies = await app.getProfileCookies();

      // await app.hero.close();

      resolve({ cookies, username: user.username });
    } catch (e) {
      console.error(e);
      // reject(e);
    }

    resolve({ cookies: [], username: _user.username });
  });
};

expose(appSignup);

export type TAppSignup = typeof appSignup;
