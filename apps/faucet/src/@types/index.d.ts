import type { TUserCookies } from '@scraper/prisma';

export type TWorkerResult = {
  username: string;
  cookies: TUserCookies | undefined;
};
