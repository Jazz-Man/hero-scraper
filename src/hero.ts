import type {IHeroCreateOptions} from "@ulixee/hero";
import {getPublicIP} from "./lib/ip-info.ts";
import Hero from "@ulixee/hero/lib/Hero";

export type THeroOptions = IHeroCreateOptions;

const getHero = async (createOptions?: THeroOptions): Promise<Hero> => {
  const ipData = await getPublicIP();

  const locale = new Intl.Locale(ipData.country, {
    region: ipData.country,
  });

  const [latitude, longitude] = ipData.ll;

  return new Hero({
    connectionToCore: {
      host: `ws://localhost:1818`,
    },
    // upstreamProxyUrl: `socks5://${ipData.proxyUser}:pass@127.0.0.1:9050`,
    // upstreamProxyUrl: ipData.proxy,
    // upstreamProxyIpMask: {
    //   publicIp: ipData.ip,
    //   proxyIp: ipData.ip,
    // },
    // dnsOverTlsProvider: OpenDnsAlternate,
    locale: locale.toString(),
    geolocation: { latitude, longitude },
    timezoneId: ipData.timezone,
    sessionKeepAlive: false,
    sessionPersistence: false,
    showChromeInteractions: false,
    mode: "production",
    ...createOptions,
  } as THeroOptions);
};

export default getHero;
