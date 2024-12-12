import {getRandomUsername} from "./proxy.ts";
import {getPublicIP, type IPInfo} from "./ip-info.ts";

const promises = [];

for (let i = 0; i <= 500; i++) {
    promises.push(getPublicIP(getRandomUsername()));
}

await Promise.allSettled<IPInfo>(promises)
    .then((results) =>
        results.forEach((result) => {
            const ipInfo = result.status === "fulfilled" ? result.value : null;

            console.log(ipInfo.ip);
        }),
    )
    .catch((e) => console.error("error", e));