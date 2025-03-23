import {
  getUserListWithCookies,
  updateSignupUserCookies
} from '@scraper/prisma';
import { Pool, spawn, Worker } from 'threads';
import type { TWorkerResult } from './@types';
import type { TAppSignup } from './workers/app-signup.ts';

const pool = Pool(() => spawn(new Worker('./workers/app-signup')), {
  name: 'app-signup'
});

const userList = await getUserListWithCookies(20);

userList.forEach((user) => {
  const task = pool.queue(
    async (appSignup: TAppSignup) => await appSignup(user)
  );
  task
    .then(async (result: TWorkerResult) => {
      console.log({ username: result.username });

      await updateSignupUserCookies(result.username, result.cookies);
    })
    .catch((e) => {
      console.error(e.toString());
    });
});

await pool.completed(true);
await pool.terminate();
