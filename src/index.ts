import getHero from "./hero.ts";

(async () => {
  try {
    const hero = await getHero({
      showChrome: true,
    });

    // await hero.goto("https://ifconfig.io");
    // await hero.goto("https://api.my-ip.io/v2/ip.txt");
    await hero.goto("https://freebitco.in");

    await hero.waitForPaintingStable(); // waits for the page to load

    const meta = await hero.meta;

    await hero.waitForMillis(10000); // waits 5 seconds

    await hero.close();

    return meta;
  } catch (e) {
    throw e;
  }
})()
  .then((res) => console.log(res))
  .catch((e) => console.log(e));
