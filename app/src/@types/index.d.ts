import type { TUserCookies } from '@scraper/db';
import type { IHeroCreateOptions } from '@ulixee/hero';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';

export type TWorkerResult = {
  username: string;
  cookies: TUserCookies | undefined;
};

export type TWorkerProxyUser = {
  username: string;
  password: string;
  tfa_secret: string | null;
  cookies?: ICookie[];
};

export type THeroOptions = IHeroCreateOptions;
export type TInputValue = string | number;

export type TAjaxRequestParams =
  | Record<string, string>
  | string
  | URLSearchParams;
