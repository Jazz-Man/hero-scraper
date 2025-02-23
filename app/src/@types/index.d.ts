import type { TUserCookies } from '@scraper/db';

export type TWorkerResult = {
  username: string;
  cookies: TUserCookies | undefined;
};
