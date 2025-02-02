import { getUserWithCookies } from '@scraper/db';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import FreeBitco from './FreeBitco.ts';

// const generateUser: TUser = {
//   username: generateTestEmail(),
//   password: generateTestPassword(),
//   tfa_secret: 'HXAZUGRYZXCG2K6N'
// };

try {
  const username = 'brooklyn45@mailcloud.pp.ua';

  const user = await getUserWithCookies(username);

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

  await app.login();
  // await app.signup();

  // @ts-ignore
  const profileCookies: ICookie[] = await app.getProfileCookies();

  console.log(profileCookies);

  // await db.$transaction(async (tx) => {
  //   if (profileCookies && profileCookies.length > 0) {
  //     await tx.user.update({
  //       where: {
  //         username
  //       },
  //       data: {
  //         hasAccount: true
  //       }
  //     });
  //
  //     for (const cookie of profileCookies) {
  //       const domain = cookie.domain ? cookie.domain : 'freebitco.in';
  //       cookie.domain = domain;
  //
  //       await tx.userCookies.upsert({
  //         where: {
  //           cookieData: {
  //             name: cookie.name,
  //             userUsername: username,
  //             domain
  //           }
  //         },
  //         update: {
  //           ...cookie,
  //           userUsername: username
  //         },
  //         create: {
  //           ...cookie,
  //           userUsername: username
  //         }
  //       });
  //     }
  //   }
  // });
} catch (e) {
  console.error(e);
}
