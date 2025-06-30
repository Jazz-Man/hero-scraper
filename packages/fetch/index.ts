import { safePromise } from "@scraper/safe";
import { fetch as bunFetch } from "bun";

export * as BunFetchHttpClient from "./BunFetchHttpClient.ts";
export * as BunHttpClient from "./BunHttpClient.ts";
export * as BunHttpClientRequest from "./BunHttpClientRequest.ts";

/**
 * @deprecated
 * @param url
 * @param options
 * @returns
 */
const fetch = async (
	url: string | URL | Request,
	options?: BunFetchRequestInit,
) =>
	await safePromise<Response>(
		bunFetch(url, {
			verbose: true,
			tls: {
				rejectUnauthorized: false,
			},
			...options,
		} as BunFetchRequestInit),
		{
			undefinedTest: false,
			logError: true,
		},
	);

export default fetch;
