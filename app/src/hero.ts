import type { IHeroCreateOptions } from '@ulixee/hero';

import ExecuteJsPlugin from '@ulixee/execute-js-plugin';

import getPublicIP from '@scraper/ip-info';
import { OpenDnsAlternate } from '@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders';
import Hero from '@ulixee/hero/lib/Hero';
import { existsSync } from 'fs';
import Path from 'path';

export type THeroOptions = IHeroCreateOptions;

const getHero = async (createOptions?: THeroOptions): Promise<Hero> => {
  const { country, ll, ip, timezone, proxy } = await getPublicIP();

  const profilePath = Path.join(__dirname, '../../.tmp/profile-test.json');

  const profileExists = existsSync(profilePath);

  const locale = country
    ? new Intl.Locale(country, {
        region: country
      })
    : null;

  const hero = new Hero({
    connectionToCore: {
      host: `ws://localhost:1818`
    },
    upstreamProxyUrl: proxy,
    upstreamProxyIpMask: {
      publicIp: ip,
      proxyIp: ip
    },
    dnsOverTlsProvider: OpenDnsAlternate,
    locale: locale?.toString(),
    geolocation: { latitude: ll?.at(0), longitude: ll?.at(1) },
    timezoneId: timezone,
    sessionKeepAlive: false,
    sessionPersistence: false,
    showChromeInteractions: false,
    mode: 'production',
    ...createOptions
  } as THeroOptions);

  hero.use(ExecuteJsPlugin);

  return hero;
};

export default getHero;
