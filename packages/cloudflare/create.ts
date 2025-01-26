import { faker } from '@faker-js/faker';
import { cfClient, zoneList } from './index';

const zones = await zoneList();

for (const zone of zones) {
  const emails = Array.from({ length: 200 }, () =>
    faker.internet
      .email({
        provider: zone.name
      })
      .toLowerCase()
  );

  const emailList = new Set<string>(emails);

  emailList.forEach(async (email) => {
    const emailRouting = await cfClient.emailRouting.rules.create({
      actions: [
        {
          type: 'forward',
          value: ['vasul.sokolyk@gmail.com']
        }
      ],
      matchers: [
        {
          type: 'literal',
          field: 'to',
          value: email
        }
      ],
      zone_id: zone.id,
      enabled: true
    });

    console.log(emailRouting);
  });
}
