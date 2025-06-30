/// <reference types="threads" />

import type { TUserCookies } from "@scraper/prisma";

/**
 * @deprecated
 */
export type TWorkerResult = {
	username: string;
	cookies: TUserCookies | undefined;
};
