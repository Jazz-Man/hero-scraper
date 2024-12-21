import { fetch as bunFetch } from "bun";

export const proxyFetch = async (url: string, options?: FetchRequestInit) => {
  return await bunFetch(url, {
    referrer:
      "https://www.bing.com/search?pc=OA1&q=public%20IP%20checking%20services%20list",
    verbose: true,
    tls: {
      rejectUnauthorized: false,
    },
    ...options,
  } as FetchRequestInit);
};
