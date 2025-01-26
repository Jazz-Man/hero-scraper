import { expose } from 'threads/worker';
import type { TWorkerProxyUser, TWorkerResult } from '../@types';
import App from '../App.ts';

const appTest = async (user: TWorkerProxyUser): Promise<TWorkerResult> => {
  const app = new App(user.username, user.password);

  await app.init(
    {
      showChrome: false,
      showDevtools: false
    },
    user.cookies
  );

  await app.goto('https://freebitco.in/?op=home');

  await app.initCookie();

  await app.signup('54827183');

  const cookies = await app.getProfileCookies();

  await app.hero.close();

  return {
    cookies,
    username: user.username
  };
};

expose(appTest);

export type TIpInfo = typeof appTest;
