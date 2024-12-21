import { getRandomUsername } from "./proxy.ts";
import { getPublicIP, type IPInfo } from "./ip-info.ts";

const promises = [];

for (let i = 0; i <= 10; i++) {
  promises.push(getPublicIP(getRandomUsername()));
}

await Promise.allSettled<IPInfo>(promises)
  .then((results) => {
    const list: Record<string, IPInfo[]> = {};

    results.forEach((result) => {
      const ipInfo = result.status === "fulfilled" ? result.value : null;

      if (ipInfo) {
        list[ipInfo.ip] = list[ipInfo.ip] || [];
        list[ipInfo.ip].push(ipInfo);
      }

    });

    console.log(list);
  })
  .catch((e) => console.error("error", e));
