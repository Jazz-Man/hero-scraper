import db from '@scraper/db';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import { Pool, spawn, Worker } from 'threads';
import type { TWorkerProxyUser, TWorkerResult } from './@types';
import type { TAppSignup } from './workers/app-signup.ts';

const pool = Pool(() => spawn(new Worker('./workers/app-signup')), {
  name: 'app-signup'
});

const userList = await db.user.findMany({
  where: {
    hasAccount: true,
    username: {
      equals: 'info@vsokolyk.pp.ua'
    }
  },
  take: 50,

  include: {
    cookies: true
  }
});

userList.forEach((user) => {
  const cookies = user.cookies?.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameParty: cookie.sameParty,
    sameSite: cookie.sameSite
  }));

  const data: TWorkerProxyUser = {
    username: user.username,
    password: user.password,
    tfa_secret: user.tfa_secret,
    // @ts-ignore
    cookies: cookies
  };

  const task = pool.queue(
    async (appSignup: TAppSignup) => await appSignup(data)
  );
  task
    .then(async (result: TWorkerResult) => {
      const cookies = result.cookies as ICookie[] | undefined;

      const username = result.username;

      await db.$transaction(async (tx) => {
        if (cookies && cookies.length > 0) {
          await tx.user.update({
            where: {
              username
            },
            data: {
              hasAccount: true
            }
          });

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
    })
    .catch(console.error);
});

// await pool.completed();
// await pool.terminate();
