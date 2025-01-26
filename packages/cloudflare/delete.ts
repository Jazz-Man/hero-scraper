import { deleteEmailRoutingRule, emailRoutingList, zoneList } from './index';

const zones = await zoneList();

for (const zone of zones) {
  const list = await emailRoutingList(zone.id);

  list.forEach(
    async (item) => await deleteEmailRoutingRule(item.id, item.zoneId)
  );
}
