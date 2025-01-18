import fetch from '@scraper/fetch';
import Cloudflare from 'cloudflare';

const client = new Cloudflare({
  apiToken: Bun.env.CF_API_TOKEN,
  fetch
});

type TZones = 'mailcloud.pp.ua' | 'mailjet.pp.ua' | 'vsokolyk.pp.ua';

const zoneMapper = new Map<TZones, string>();

// zoneMapper.set('mailcloud.pp.ua', 'a2d34dce958887934390e3e312336977');
// zoneMapper.set('mailjet.pp.ua', '5ab7a34be72b5dcb6b71d0f4cb5d4bd3');
zoneMapper.set('vsokolyk.pp.ua', '17ca01797072147b7318379802ab4ef1');

const zone_id = zoneMapper.get('vsokolyk.pp.ua') as string;

// zoneMapper.forEach((zone_id, domain) => {
//   const emails = Array.from({ length: 200 }, () =>
//     faker.internet
//       .email({
//         provider: domain
//       })
//       .toLowerCase()
//   );
//
//   const emailList = new Set<string>(emails);
//
//   emailList.forEach(async (email) => {
//     // sleep(5000);
//
//     const emailRouting = await client.emailRouting.rules.create({
//       actions: [
//         {
//           type: 'forward',
//           value: ['Bun.env.IMAP_EMAIL_ADDRESS']
//         }
//       ],
//       matchers: [
//         {
//           type: 'literal',
//           field: 'to',
//           value: email
//         }
//       ],
//       zone_id
//       // priority: 1,
//       // enabled: true
//     });
//
//     console.log(emailRouting);
//   });
//
//   // console.log(emailList);
// });

// const emailRouting = await client.emailRouting.rules.create({
//   zone_id,
//   priority: 1,
//   action: 'allow',
//   pattern: 'example.com',
//   description: 'example.com'
// });

const emailRoutingList = await client.emailRouting.rules.list({
  zone_id,
  enabled: true,
  // page: 1
  per_page: 50
});

// console.log(
//   emailRoutingList.result.filter(
//     (item) => item.name === 'e922914181d54cd5a387aa01df848e61'
//   )
// );

emailRoutingList.result.forEach(async (item) => {
  if (!item.enabled) {
    return;
  }

  const matchers = item.matchers?.at(0);

  if (matchers?.value === 'info@vsokolyk.pp.ua') {
    return;
  }

  // if (item.id === 'e922914181d54cd5a387aa01df848e61') {
  //   return;
  // }

  const res = await client.emailRouting.rules.delete(item.id as string, {
    zone_id
  });

  console.log(res);
});
