import {fetch as bunFetch} from "bun";

import {HeaderGenerator} from "header-generator";

const headerGenerator = new HeaderGenerator({
  httpVersion: "2",
  browsers: ["chrome"],
  operatingSystems: ["macos"],
  devices: ["desktop"],
  locales: ["en-US"],
});

const headers = new Headers();

const allHeaders = headerGenerator.getHeaders();

Object.entries(allHeaders).map(([header, value]) => {
  headers.set(header, value);
});


export const proxyFetch = async (
  url: string,
  options?: FetchRequestInit,
) => {
  return await bunFetch(url, {
    referrer:
      "https://www.bing.com/search?pc=OA1&q=public%20IP%20checking%20services%20list",
    verbose: true,
    tls: {
      rejectUnauthorized: false,
    },
    headers,
    ...options,
  } as FetchRequestInit);
};
