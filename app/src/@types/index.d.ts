import type { IHeroCreateOptions } from '@ulixee/hero';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';

export type TWorkerResult = {
  username: string;
  cookies: ICookie[] | boolean;
};

export type TWorkerProxyUser = {
  username: string;
  password: string;
  tfa_secret: string | null;
  cookies?: ICookie[];
};

export type THeroOptions = IHeroCreateOptions;

export type MaybeUndefinedPromise<T> = Promise<T | undefined>;
export type MaybeStringPromise = MaybeUndefinedPromise<string>;

export type TSetCookieOptions = Omit<ICookie, 'name' | 'value' | 'expires'> & {
  expires?: Date | number;
};

export type TInputValue = string | number;

export type TTimeoutMsOptions = {
  timeoutMs?: number;
};

export type TTGotoOptions = {
  referrer?: string;
} & TTimeoutMsOptions;

export type TCfType = 'free_play' | 'signup_form';

export type TCfTypeSelectors = Record<TCfType, string>;

export type TPostBodyParams = Record<string, string> | string | URLSearchParams;

export type TAccountCookie = Record<
  'btc_address' | 'password' | 'fbtc_userid' | 'fbtc_session',
  string
>;

export type TUser = {
  username: string;
  password: string;
  tfa_secret: string;
};
