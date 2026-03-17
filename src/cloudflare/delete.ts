import { deleteEmailRoutingRule, emailRoutingList, zoneList } from ".";

const zones = await zoneList();

for (const zone of zones) {
	const list = await emailRoutingList(zone.id);

	await Promise.all(
		list.map((item) => deleteEmailRoutingRule(item.id, item.zoneId)),
	);
}
