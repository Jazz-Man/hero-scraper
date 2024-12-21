import { fetch as bunFetch } from "bun";

const fetch = async (url: string, options?: FetchRequestInit) =>
  await bunFetch(url, {
    verbose: true,
    tls: {
      rejectUnauthorized: false,
    },
    ...options,
  } as FetchRequestInit);

export default fetch;
