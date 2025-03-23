import getPublicIP, { type IPInfo } from "./index.ts";
import { getRandomUsername } from "./src/proxy.ts";

const promises = [];

for (let i = 0; i <= 10; i++) {
	promises.push(getPublicIP(getRandomUsername()));
}

await Promise.allSettled<IPInfo>(promises)
	.then((results) => {
		const list: Record<string, IPInfo[]> = {};

		for (const result of results) {
			const ipInfo = result.status === "fulfilled" ? result.value : null;

			if (ipInfo) {
				list[ipInfo.ip] = list[ipInfo.ip] || [];
				list[ipInfo.ip].push(ipInfo);
			}
		}

		console.log(list);
	})
	.catch((e) => console.error("error", e));
