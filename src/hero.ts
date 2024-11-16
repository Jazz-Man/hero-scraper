import Hero from "@ulixee/hero/lib/Hero";
import type { IHeroCreateOptions } from "@ulixee/hero";
import { fetch } from "bun";
import geoip from "geoip-lite";
import {Cloudflare} from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";

type IPData = {
  YourFuckingIPAddress: string;
  YourFuckingLocation: string;
  YourFuckingHostname: string;
  YourFuckingISP: string;
  YourFuckingTorExit: string;
  YourFuckingCity: string;
  YourFuckingCountry: string;
  YourFuckingCountryCode: string;
};

export type THeroOptions = IHeroCreateOptions;

const getRandomUsername = () => `x${Math.floor(Math.random() * 100000)}x`;

const getProxyUrl = () => `http://${getRandomUsername()}:pass@127.0.0.1:9080`;

const getPublicIp = async () => {
  const proxy = getProxyUrl();

  const options: FetchRequestInit = {
    proxy,
  };

  const response = await fetch("https://wtfismyip.com/json", options);

  const ipData = (await response.json()) as IPData;

  return {
    proxy,
    ipData,
  };
};

const getHero = async (createOptions?: THeroOptions): Promise<Hero> => {
  const ip = await getPublicIp();

  const geo = geoip.lookup(ip.ipData.YourFuckingIPAddress);

  const locale = new Intl.Locale(ip.ipData.YourFuckingCountryCode, {
    region: ip.ipData.YourFuckingCountryCode,
  });

  const [latitude, longitude] = geo.ll;

  return new Hero({
    connectionToCore: {
      host: `ws://localhost:1818`,
    },
    upstreamProxyUrl: ip.proxy,
    upstreamProxyIpMask: {
      publicIp: ip.ipData.YourFuckingIPAddress,
      proxyIp: ip.ipData.YourFuckingIPAddress,
    },
    dnsOverTlsProvider: Cloudflare,
    locale: locale.toString(),
    geolocation: { latitude, longitude },
    timezoneId: geo.timezone,
    sessionKeepAlive: false,
    sessionPersistence: false,
    mode: "production",
    ...createOptions,
  } as THeroOptions);
};

export default getHero;
