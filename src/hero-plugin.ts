import Hero from "@ulixee/hero/lib/Hero";
import { Cloudflare } from "@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders";
import {getProxyUrl} from "./lib/proxy.ts";


(async function main() {
  const hero = new Hero({
    connectionToCore: {
      host: `ws://localhost:1818`,
    },

    showChrome: true,

    upstreamProxyUrl: getProxyUrl(),
    dnsOverTlsProvider: Cloudflare,
    sessionKeepAlive: false,
    sessionPersistence: false,
  });

  await hero.goto("https://ipinfo.io/json");
  await hero.activeTab.waitForPaintingStable();

  await hero.waitForMillis(20000); // waits 5 seconds

  await hero.close();
})();
