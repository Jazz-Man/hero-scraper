import { safePromise } from '@scraper/safe';
import { fetch as bunFetch } from 'bun';

const fetch = async (url: string, options?: FetchRequestInit) =>
  await safePromise<Response>(
    bunFetch(url, {
      verbose: true,
      tls: {
        rejectUnauthorized: false
      },
      ...options
    } as FetchRequestInit),
    {
      undefinedTest: false,
      logError: true
    }
  );

export default fetch;
