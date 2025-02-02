import type { IHeroCreateOptions } from '@ulixee/hero';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';

export type TWorkerResult = {
  username: string;
  cookies: ICookie[] | undefined;
};

export type TWorkerProxyUser = {
  username: string;
  password: string;
  tfa_secret: string | null;
  cookies?: ICookie[];
};

export type THeroOptions = IHeroCreateOptions;
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

export type TGlobalVarsType =
  | 'max_win_amount'
  | 'token_name'
  | 'tcGiQefA'
  | 'latest_lottery_round'
  | 'um2VHVjSZ'
  | 'ad_left'
  | 'show_sky'
  | 'mobile_device'
  | 'socket_password'
  | 'socket_userid'
  | 'request_us_int'
  | 'free_rp'
  | 'ref_rp'
  | 'multiply_rp'
  | 'rp_promo_active'
  | 'rp_promo_active2'
  | 'm_w_fee'
  | 'i_w_fee'
  | 'min_bonus_amount'
  | 'max_deposit_bonus'
  | 'min_withdraw'
  | 'hash_match'
  | 'current_contest_round'
  | 'userid'
  | 'pushpad_hash'
  | 'captcha_type'
  | 'free_play'
  | 'multi_acct_same_ip'
  | 'country'
  | 'rp_promo_start'
  | 'rp_promo_end'
  | 'rp_promo_counter'
  | 'rp_multiplier'
  | 'dep_bonus_eligible'
  | 'auto_withdraw'
  | 'bonus_locked_balance'
  | 'bonus_wagering_remaining'
  | 'show_2fa_msg'
  | 'token1'
  | 'signup_token'
  | 'user_email';

export type TGlobalVars = Partial<Record<TGlobalVarsType, string | number>>;
