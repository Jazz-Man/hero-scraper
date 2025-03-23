import type { PrismaClient } from "../client";

import faker from "@scraper/faker";

import { emailRoutingList, zoneList } from "@scraper/cloudflare";

export default async function seedFunction(prisma: PrismaClient) {
	const zones = await zoneList();

	for (const zoneItem of zones) {
		await prisma.zone.upsert({
			where: {
				zoneId: zoneItem.id,
			},
			update: {},
			create: {
				zoneId: zoneItem.id,
				domain: zoneItem.name,
			},
		});

		const list = await emailRoutingList(zoneItem.id);

		await prisma.$transaction(async (t) => {
			for (const item of list) {
				const password = faker.internet.password({
					length: 17,
					pattern: /\w/,
				});

				await t.emailRule.upsert({
					where: {
						id: item.id,
					},
					create: {
						id: item.id,
						email: item.email,
						forwardTo: item.forwardTo,
						zoneId: zoneItem.id,
						User: {
							connectOrCreate: {
								where: {
									username: item.email,
								},
								create: {
									password,
								},
							},
						},
					},
					update: {},
				});
			}
		});
	}
}
