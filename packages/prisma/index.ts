import { Prisma } from './client';
import db from './db.ts';

export * from './client';

export const getUserWithCookies = async (username: string) =>
  db.user.findUniqueOrThrow({
    where: {
      username
    },
    include: {
      cookies: {
        select: {
          name: true,
          value: true,
          domain: true,
          path: true,
          expires: true,
          httpOnly: true,
          secure: true,
          sameParty: true,
          sameSite: true
        }
      }
    }
  });

export type TUsersWithCookies = Prisma.PromiseReturnType<
  typeof getUserWithCookies
>;

export const getUserListWithCookies = (limit: number = 50) =>
  db.user.findMany({
    where: {
      hasAccount: true
    },
    take: limit,
    include: {
      cookies: {
        select: {
          name: true,
          value: true,
          domain: true,
          path: true,
          expires: true,
          httpOnly: true,
          secure: true,
          sameParty: true,
          sameSite: true
        }
      }
    }
  });

export type TUserListWithCookies = Prisma.PromiseReturnType<
  typeof getUserListWithCookies
>;
export type TUserCookies = TUsersWithCookies['cookies'];

export default db;
