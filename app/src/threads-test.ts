import { db } from '@scraper/db';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import { Pool, spawn, Worker } from 'threads';
import type { TWorkerProxyUser, TWorkerResult } from './@types';
import type { TIpInfo } from './workers/app-test.ts';

const pool = Pool(() => spawn(new Worker('./workers/app-test')), {
  // size: 50,

  name: 'app-test'
});

const userList = await db.user.findMany({
  where: {
    hasAccount: false
  },
  take: 10,

  include: {
    cookies: true
  }
});

userList.forEach((user) => {
  const cookies = user.cookies?.map((cookie) => {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameParty: cookie.sameParty,
      sameSite: cookie.sameSite
    };
  });

  const data: TWorkerProxyUser = {
    username: user.username,
    password: user.password,
    tfa_secret: user.tfa_secret,
    // @ts-ignore
    cookies: cookies
  };

  const task = pool.queue(async (ipInfo: TIpInfo) => await ipInfo(data));
  task
    .then(async (result: TWorkerResult) => {
      const cookies = result.cookies as ICookie[] | undefined;

      const username = result.username;

      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: {
            username
          },
          data: {
            hasAccount: true
          }
        });

        if (cookies && cookies.length > 0) {
          for (const cookie of cookies) {
            const domain = cookie.domain ? cookie.domain : '.freebitco.in';
            cookie.domain = domain;

            await tx.userCookies.upsert({
              where: {
                cookieData: {
                  name: cookie.name,
                  userUsername: username,
                  domain
                }
              },
              update: {
                ...cookie,
                userUsername: username
              },
              create: {
                ...cookie,
                userUsername: username
              }
            });
          }
        }
      });

      console.log({ username });
    })
    .catch(console.error);
});

await pool.completed();
await pool.terminate();
