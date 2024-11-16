import getHero from "./hero.ts";

const promises = [];

async function exec(iteration: number) {
  console.log(`Running iteration ${iteration}`);

  const hero = await getHero({
    // showChrome: true,
  });

  await hero.goto("https://freebitco.in");
  await hero.waitForPaintingStable(); // waits for the page to load
  console.log(`webpage loaded ${iteration}`)
  const meta = await hero.meta;
  // await hero.waitForLoad(LocationStatus.AllContentLoaded);

  await hero.waitForMillis(3000); // waits 5 seconds

  console.log(`script finished ${iteration}`);


  await hero.close();

  return meta.upstreamProxyIpMask;
}

for (let i = 0; i <= 100; i++) {
  promises.push(exec(i));
}

await Promise.allSettled(promises)
  .then((results) => results.forEach((result) => console.log("result", result)))
  .catch((e) => console.error("error", e));
