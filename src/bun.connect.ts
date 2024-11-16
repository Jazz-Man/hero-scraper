import { fetch } from "bun";

import geoip from "geoip-lite";

const randomUsername = `x${Math.floor(Math.random() * 100000)}x`;

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

export const proxy = `http://${randomUsername}:pass@127.0.0.1:9080`;

const options: FetchRequestInit = {
  proxy,
};

const response = await fetch("https://wtfismyip.com/json", options);

const ipData = (await response.json()) as IPData;

export const geo = geoip.lookup(ipData.YourFuckingIPAddress);

export default ipData;
