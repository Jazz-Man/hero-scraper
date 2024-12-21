import { fetch as bunFetch } from "bun";

export const proxyFetch = async (url: string, options?: FetchRequestInit) => {
  return await bunFetch(url, {
    verbose: true,
    tls: {
      rejectUnauthorized: false,
    },
    ...options,
  } as FetchRequestInit);
};