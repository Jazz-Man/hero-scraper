import {fetch as bunFetch} from "bun";

const data = await bunFetch("https://wtfismyip.com/json", {
  proxy: 'http://127.0.0.1:9003',
  signal: AbortSignal.timeout(30000),
  verbose: true,
  // verbose: false
} as FetchRequestInit)

console.log(await data.json());