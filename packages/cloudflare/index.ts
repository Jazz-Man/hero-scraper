import fetch from "@scraper/fetch";
import Cloudflare from "cloudflare";
import type { Zone } from "cloudflare/resources/zones/zones";
import type { EmailRoutingRule } from "cloudflare/src/resources/email-routing/rules/rules.ts";

export const cfClient = new Cloudflare({
	apiToken: Bun.env.CF_API_TOKEN,
	fetch,
});

export const zoneList = (): Promise<Zone[]> => {
	return new Promise(async (resolve, reject) => {
		try {
			const zoneList = await cfClient.zones.list({
				per_page: 50,
			});

			resolve(zoneList.result);
		} catch (e) {
			reject(e);
		}
	});
};

export type TEmailRule = {
	id: string;
	email: string;
	forwardTo: string;
	zoneId: string;
};

export const emailRoutingList = async (
	zone_id: string,
	per_page = 50,
): Promise<TEmailRule[]> => {
	const rules: EmailRoutingRule[] = [];

	try {
		let page = 1;

		let response = await cfClient.emailRouting.rules.list({
			zone_id,
			enabled: true,
			per_page,
			page,
		});

		rules.push(...response.getPaginatedItems());

		// @ts-ignore
		const totalCount = response.result_info?.total_count || 0;
		const totalPages = Math.ceil(totalCount / per_page);

		for (let i = 2; i <= totalPages; i++) {
			page = i;

			response = await cfClient.emailRouting.rules.list({
				zone_id,
				enabled: true,
				per_page,
				page,
			});

			rules.push(...response.getPaginatedItems());
		}
	} catch (error) {
		throw error;
	}

	return rules
		.filter((rule) => {
			if (!rule.enabled) {
				return false;
			}

			const matchers = rule.matchers?.at(0);

			// @ts-ignore
			if (matchers?.type === "all") {
				return false;
			}

			if (typeof matchers?.value === "undefined") {
				return false;
			}

			const forwardTo = rule.actions?.at(0)?.value?.at(0);

			return typeof forwardTo !== "undefined";
		})
		.map<TEmailRule>((rule) => ({
			id: rule.id as string,
			email: rule.matchers?.at(0)?.value || "",
			forwardTo: rule.actions?.at(0)?.value?.at(0) || "",
			zoneId: zone_id,
		}));
};

export const deleteEmailRoutingRule = async (id: string, zone_id: string) =>
	await cfClient.emailRouting.rules.delete(id, {
		zone_id,
	});
