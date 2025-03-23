import type { $Enums, Prisma } from "./client";
import db from "./db.ts";

export * from "./client";

export const getUserWithCookies = async (username: string) =>
	db.user.findUniqueOrThrow({
		where: {
			username,
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
					sameSite: true,
				},
			},
		},
	});

export type TUsersWithCookies = Prisma.PromiseReturnType<
	typeof getUserWithCookies
>;

export const getUserListWithCookies = (limit = 50) =>
	db.user.findMany({
		where: {
			hasAccount: false,
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
					sameSite: true,
				},
			},
		},
	});

export type TUserListWithCookies = Prisma.PromiseReturnType<
	typeof getUserListWithCookies
>;
export type TUserCookies = TUsersWithCookies["cookies"];

export type TSameSiteCookie = $Enums.SameSite;

export const updateSignupUserCookies = async (
	userUsername: string,
	cookies: TUserCookies | undefined,
) => {
	if (!cookies) {
		return;
	}

	await db.$transaction(async (tx) => {
		await tx.user.update({
			where: {
				username: userUsername,
			},
			data: {
				hasAccount: true,
			},
		});

		for (const cookie of cookies) {
			await tx.userCookies.upsert({
				where: {
					cookieData: {
						name: cookie.name,
						userUsername,
						domain: cookie.domain as string,
					},
				},
				create: {
					...cookie,
					userUsername,
				},
				update: {
					...cookie,
					userUsername,
				},
			});
		}
	});
};

export default db;
