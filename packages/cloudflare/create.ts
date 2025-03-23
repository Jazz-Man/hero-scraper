import faker from "@scraper/faker";
import { cfClient, zoneList } from "./index.ts";

const zones = await zoneList();

for (const zone of zones) {
	const emails = Array.from({ length: 200 }, () =>
		faker.internet
			.email({
				provider: zone.name,
			})
			.toLowerCase(),
	);

	const emailList = new Set<string>(emails);

	for (const email of emailList) {
		const emailRouting = await cfClient.emailRouting.rules.create({
			actions: [
				{
					type: "forward",
					value: ["Bun.env.IMAP_EMAIL_ADDRESS"],
				},
			],
			matchers: [
				{
					type: "literal",
					field: "to",
					value: email,
				},
			],
			zone_id: zone.id,
			enabled: true,
		});

		console.log(emailRouting);
	}
}
