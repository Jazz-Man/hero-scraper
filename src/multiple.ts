import {fetch as bunFetch} from "bun";

import getHero from "./hero.ts";
import {LocationStatus} from "@ulixee/unblocked-specification/agent/browser/Location";

import fs from "node:fs";
import * as path from "node:path";
import {proxyFetch} from "./lib/fetch.ts";
import {getProxyUrl} from "./lib/proxy.ts";

const promises = [];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function exec(iteration: number) {
  await delay(1000);

  console.log(`Running iteration ${iteration}`);

  const hero = await getHero({
    showChrome: true,
    sessionPersistence: false,
    // showDevtools: true,
  });


  const { activeTab, document, interact, fetch } = hero;

  // const proxy = getProxyUrl();
  //
  // const data = await fetch("https://myip.wtf/json", {
  //   proxy,
  //   verbose: true
  // }).then(async (response) => {
  //   const contentType = await response.headers.get("content-type");
  //
  //   return contentType?.includes("application/json")
  //       ? await response.json()
  //       : await response.text();
  // })


  // console.log(data);

  const cookieStorage = activeTab.cookieStorage;

  await hero.goto("https://freebitco.in/?op=s", {
    referrer: "https://www.google.com/search?q=freebitco.in&sca_esv=18e5535cf3e6f854&source=hp&ei=DCFOZ5f5LuHB4-EPke2LqA8&iflsig=AL9hbdgAAAAAZ04vHMTfd3VjJtKFCvWypXR6ys0TSH-Q&ved=0ahUKEwiXr7S-_omKAxXh4DgGHZH2AvUQ4dUDCA4&uact=5&oq=freebitco.in&gs_lp=Egdnd3Mtd2l6IgxmcmVlYml0Y28uaW4yBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAESOAHUJsBWJsBcAF4AJABAJgBS6ABS6oBATG4AQPIAQD4AQL4AQGYAgKgAlWoAgrCAgoQABgDGOoCGI8BwgIKEC4YAxjqAhiPAZgDCJIHATKgB8EH&sclient=gws-wiz",
  });

  await hero.activeTab.on('resource', (resource) => {
    if (resource.response.statusCode !== 200) {
      console.log(resource);
    }
  })
  await hero.waitForPaintingStable(); // waits for the page to load
  console.log(`webpage loaded ${iteration}`);
  const meta = await hero.meta;
  await hero.waitForLoad(LocationStatus.AllContentLoaded);

  await cookieStorage.setItem('hide_push_msg', '1', {
    secure: true,
    // @ts-ignore
    domain: '.freebitco.in',
    path: '/'
  });

  // await cookieStorage.setItem('hmt_id', '859a1523-f538-4c23-b18d-0cde94e5a0bc', {
  //   secure: true,
  //   sameSite: 'None',
  //   // @ts-ignore
  //   domain: 'api.hcaptcha.com',
  //   path: '/'
  // });

  await cookieStorage.setItem('hc_accessibility', 'uh4UaX4cjiph37enlj45vEe1wRZQLQ1b/tdUpKZ5Eo0Uh6BeHJ/26CaK3yF6sRljxLJmJMHUbUHhACzrsK8ZB6R0hPTkdL+N5/PSf19BL4TZsW32GSWAjwIa43ZQe911/G9vF++xbY6YU4FCDBa8CVbVIhbFxk716LldnLw3nhzqvsED5WmMfhZDq7hq4D7zwCvVFk1DBiipd0UW6LW/TlpnJGmgngCCEIM9XPgGig1ks1JuKit+NK8Yglb6hJTHYA6a3w338demJrd3eb3r7gmmUgzWNdg/wuagueJSGJTfgr1QOUUkTgGS02QLDCqjWZnAP+Hq8ca6lTBRf8SlYPBBOeU8W2D2TOrm7udkcb6qnGcGuGEWAnjS2flQ7KX1okh0hFY2/HKWFvBvc6n8vThgxMM5SqYHLbAUag9qTUNjpV0obEW9EZdfXGSCwYpl7aS8/2ZyZyaltTQ+fiSt21gNLwRhMpqZ7k7pwaL8yIHR2rYegCQqtufh3uALpFNKNgMXiBacwmJpprLNJwpYDU/EJhqA/upymQb08gBP9hu+Mu5h4FV8NM2E6Ft1+1fkm6SGweefoXg9QumPdF878RAvU8oiDuLd5wxBCNDOgErXDO/hxhANs37Phrnk69nUqnZqnO0/5Kf/zavl7biUU3WqQGg90nvOm4HMafgzOOjiTcQ2sEwgVtaEGvYPm010LwzqbMmh7XuLVJhoxjbHMIEkaWUYKP3tuKCEx11tLKoz0AzyKtPdKK1E/xm2yJ7h/tuynR6riDK6WNVh/YPW57sRBRKmg7q9xKbif96KhTl2+3RYtsxRpo9gbPMNNOifC2vjUW3RzkkKZCtbETdd7SWLdYDcUjiR5Nfb8Ki9EvoU4mdeebxNWN0XGjQJ0JdEKAtFe7UT0oUF0XhqnUv/DY0zxuXnvqSDvNJdQRsEkesC3Y8kplx8IR5BJvxXgiYUnvwvx3XdUolfMhDAyCjb07s92mI9b0HsmOpYFrJu9GjeU4NrmUoaXBs/G4mwUU9IORIu3rIDuzr4cNj5Ke50pOpdXxLJ7ignX/fXFLLlGn7uN6fYwZnoj3KEBlS0e9wLp1jPSiCeyUH+vUc1jYS4BCfXtkZXXEyYzWbvUNoH0m4=xhBxwtJIPgr2IAuN', {
    secure: true,
    sameSite: 'None',
    // @ts-ignore
    domain: '.hcaptcha.com',
    path: '/'
  });

  // await cookieStorage.setItem('ph_phc_fhS1E6ysPjT3r9Q1EO1kehh905Xla2NweqvcLnIYjO3_posthog', '%7B%22distinct_id%22%3A%225548776%22%2C%22%24sesid%22%3A%5B1733172550460%2C%220193891a-6893-75b5-97a5-9113630a3be4%22%2C1733172029587%5D%2C%22%24epp%22%3Atrue%7D', {
  //   sameSite: 'Lax',
  //   secure: true,
  //   // @ts-ignore
  //   domain: '.hcaptcha.com',
  //   path: '/'
  // });

  await cookieStorage.setItem('hide_rp_for_wof_msg', '1', {
    secure: true,
    // @ts-ignore
    domain: 'freebitco.in',
    path: '/'
  });

  await cookieStorage.setItem('hide_premium_membership_msg', '1', {
    secure: true,
    // @ts-ignore
    domain: '.freebitco.in',
    path: '/'
  });

  await cookieStorage.setItem('cookieconsent_dismissed', 'yes', {
    // @ts-ignore
    domain: '.freebitco.in',
    path: '/'
  });

  console.log(`script finished ${iteration}`);

  await hero.waitForMillis(5000); // waits 5 seconds

  const screenshot = await hero.takeScreenshot ({
    format: "png",
    fullPage: true,
  });


  const screenshotFile = path.resolve(__dirname, `../.tmp/screenshots/${iteration}.png`);

  fs.writeFile(screenshotFile, screenshot, (err) => {
    if (err) throw err;
    console.log("The file has been saved!");
  });

  // await hero.close();

  return meta.upstreamProxyIpMask;
}

for (let i = 0; i < 1; i++) {
// for (let i = 0; i <= 10; i++) {
  promises.push(exec(i));
}

await Promise.allSettled(promises)
  .then((results) => results.forEach((result) => console.log("result", result)))
  .catch((e) => console.error("error", e));
