import setCookie from 'set-cookie-parser';

import { safe, safePromise } from '@scraper/safe';
import Response from '@ulixee/awaited-dom/impl/official-klasses/Response';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import HeroBase, { type TSetCookieOptions } from './HeroBase.ts';
import { needsInit, needsLogin, needsPageReady } from './classDecorators.ts';

type TCfType = 'free_play' | 'signup_form';

type TCfTypeSelectors = Record<TCfType, string>;

type TPostBodyParams = Record<string, string> | string | URLSearchParams;

type TAccountCookie = {
  btc_address: string;
  password: string;
  fbtc_userid: string;
  fbtc_session: string;
};

export default class App extends HeroBase {
  private isLoggedIn: boolean = false;
  private csrfToken: string | undefined;

  constructor(
    protected username: string,
    protected password: string,
    protected showChrome = false
  ) {
    super();
  }

  hasCsrfToken() {
    return !!this.csrfToken;
  }

  @needsInit()
  @needsPageReady()
  getIsLoggedIn() {
    return this.isLoggedIn;
  }

  @needsInit()
  @needsPageReady()
  private async initCsrfToken() {
    const csrfToken = await safe<ICookie>(
      this.cookieStorage.getItem('csrf_token')
    );

    if (csrfToken.success && csrfToken.data.value.length) {
      this.csrfToken = csrfToken.data.value;
    } else {
      const charSet2 =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let randomString2 = '';
      let i;
      for (i = 0; i < 12; i++) {
        const randomPoz = Math.floor(Math.random() * charSet2.length);
        randomString2 += charSet2.substring(randomPoz, randomPoz + 1);
      }

      await this.setCookie('csrf_token', randomString2, {
        secure: true
      });

      this.csrfToken = randomString2;
    }
  }

  @needsInit()
  @needsPageReady()
  async initCookie(): Promise<void> {
    await safe(this.hero.waitForMillis(3000));

    await this.initCsrfToken();

    const profile = this.profileCookies;

    if (profile?.length) {
      this.csrfToken = profile.find(
        (cookie) =>
          cookie.name === 'csrf_token' &&
          cookie.path === '/' &&
          cookie.domain === '.freebitco.in'
      )?.value;

      this.isLoggedIn = true;

      return;
    }

    const btc = await safe<ICookie>(this.cookieStorage.getItem('btc_address'));

    if (btc.success && btc.data?.value.length) {
      this.isLoggedIn = true;
      console.log(
        { btc_address: btc.data.value, isLoggedIn: this.isLoggedIn },
        'initCookie'
      );
      return;
    }

    const hideCookies = [
      'mine_btc',
      'earn_btc',
      'push',
      'free_wof_spins',
      'premium_membership',
      'rp_for_wof'
    ];

    for (const cookie of hideCookies) {
      await this.setCookie(`hide_${cookie}_msg`, '1', {
        secure: true,
        expires: 3650
      });
    }

    await this.setCookie('cookieconsent_dismissed', 'yes', {
      secure: true
    });

    await this.reload();

    console.log('initCookie done');

    return;
  }

  setCookie = async (
    key: string,
    value: string,
    options: TSetCookieOptions = {}
  ): Promise<void> => {
    const domains = ['.freebitco.in', 'freebitco.in'];

    for (const domain of domains) {
      await super.setCookie(key, value, {
        domain: domain,
        path: '/',
        ...options
      });
    }
  };

  public getFingerprintMd5 = async (): Promise<string> =>
    await this.getJsValue<string>(`$.fingerprint()`, {
      err: '"$.fingerprint()" fingerprint not found'
    });

  public getFingerprintT = async (): Promise<string> =>
    await safePromise<string>(
      this.hero.executeJs(() => {
        // @ts-ignore
        if (window.Fingerprint === undefined) {
          return undefined;
        }
        // @ts-ignore
        const t = new Fingerprint({
          canvas: !0,
          screen_resolution: !0,
          ie_activex: !0
        });

        return t.get();
      })
    );

  @needsPageReady()
  // @needsCsrfToken()
  async postRequest(url: string, bodyParams: TPostBodyParams): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const params = new URLSearchParams(bodyParams);

      const token = params.has('csrf_token')
        ? (params.get('csrf_token') as string)
        : (this.csrfToken as string);

      if (!params.has('csrf_token')) {
        params.set('csrf_token', token);
      }

      const request = new this.hero.Request(url, {
        credentials: 'include',
        redirect: 'follow',
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-csrf-token': token
        },
        body: params.toString()
      });

      const response = await safePromise<Response>(this.hero.fetch(request), {
        logError: true
      });

      const responseStatusCode = await response.status;
      const responseStatusText = await response.statusText;

      if (responseStatusCode > 200) {
        reject(responseStatusText);
        return;
      }

      const combinedCookieHeader = await safePromise<string | null>(
        response.headers.get('set-cookie')
      );

      if (combinedCookieHeader?.length) {
        const splitCookieHeaders =
          setCookie.splitCookiesString(combinedCookieHeader);

        const cookies = setCookie.parse(splitCookieHeaders);

        for (const cookie of cookies) {
          await this.setCookie(cookie.name, cookie.value, {
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expires: cookie.expires
          });
        }
      }

      const text = await safePromise(response.text());
      resolve(text);
    });
  }

  private async initAccountCookie(cookie: TAccountCookie) {
    await this.setCookie('btc_address', cookie.btc_address, {
      expires: 3650,
      secure: true
    });
    await this.setCookie('password', cookie.password, {
      expires: 3650,
      secure: true
    });
    await this.setCookie('fbtc_userid', cookie.fbtc_userid, {
      expires: 3650,
      secure: true
    });

    await this.setCookie('fbtc_session', cookie.fbtc_session, {
      expires: 3650,
      secure: true
    });

    await this.setCookie('have_account', '1', {
      expires: 3650,
      secure: true
    });

    this.isLoggedIn = true;

    await this.goto('https://freebitco.in/?op=home');
  }

  @needsInit()
  @needsPageReady()
  async login(tfa_code: string | undefined = undefined): Promise<boolean> {
    if (this.isLoggedIn) {
      console.log('login ok', { isLoggedIn: this.isLoggedIn });
      // resolve(true);
      return true;
    }

    // const current_btc_address = await this.getCookieValue('btc_address');
    //
    // if (current_btc_address?.length) {
    //   this.isLoggedIn = true;
    //   console.log(
    //     { btc_address: current_btc_address, isLoggedIn: this.isLoggedIn },
    //     'login ok'
    //   );
    //   return true;
    // }

    const params: TPostBodyParams = {
      op: 'login_new',
      btc_address: this.username,
      password: this.password
    };

    if (tfa_code) {
      params.tfa_code = tfa_code;
    }

    const loginStatus = await this.postRequest('/', params);

    console.log({ loginStatus }, 'loginStatus');

    const [status, ...loginData] = loginStatus?.split(':');

    if (status !== 's') {
      console.log('login failed');

      throw new Error(loginData[0]);
    }

    const [btc_address, password, fbtc_userid, fbtc_session] = loginData;

    await this.initAccountCookie({
      btc_address,
      password,
      fbtc_userid,
      fbtc_session
    });

    console.log('login ok', { isLoggedIn: this.isLoggedIn });

    return true;

    // return new Promise(async (resolve, reject) => {
    //   resolve(true);
    // });
  }

  @needsInit()
  @needsPageReady()
  async signup() {
    await safe(this.cookieStorage.clear());

    await this.reload();

    const fingerprint = await this.getFingerprintMd5();

    const cf_captcha_response = await this.getCfResponse('signup_form');

    const params: TPostBodyParams = {
      op: 'signup_new',
      password: this.password,
      email: this.username,
      fingerprint,
      // referrer: undefined,
      // tag: undefined,
      captcha_type: '77',
      cf_captcha_response
    };

    const signupStatus = await this.postRequest('/', params);

    const [status, ...signupData] = signupStatus?.split(':');

    console.log({ status, signupData, params }, 'signupStatus');

    if (status === 'e') {
      const isEmailExists =
        signupData?.at(1) && signupData[1] === 'email_exists';

      const error = isEmailExists ? signupData[0] : signupData[0];

      return;
    }

    const [btc_address, password, fbtc_userid, fbtc_session] = signupData;

    await this.initAccountCookie({
      btc_address,
      password,
      fbtc_userid,
      fbtc_session
    });
  }

  async getCfResponse(type: TCfType): Promise<string> {
    const selector: TCfTypeSelectors = {
      free_play: '#freeplay_form_cf_turnstile',
      signup_form: '#signup_form_cf_turnstile'
    };

    if (!selector.hasOwnProperty(type)) {
      throw new Error('invalid type');
    }

    return await this.getInputValue<string>(
      `${selector[type]} [name='cf-turnstile-response']`
    );
  }

  @needsLogin()
  async freePlay() {
    const timeRemainingExists = await this.isVisible(
      '#free_play_tab #wait #time_remaining'
    );

    if (timeRemainingExists) {
      console.log({ timeRemainingExists });
      return;
    }

    const playBtn = await this.queryElement('#free_play_form_button');

    await safe(
      this.hero.interact({
        scroll: playBtn
      })
    );

    const fingerprint = await this.getFingerprintMd5();

    if (!fingerprint) {
      throw new Error('fingerprint not found');
    }

    const fingerprint2 = await this.getFingerprintT();

    if (!fingerprint2) {
      throw new Error('fingerprint2 not found');
    }

    const op = await this.getInputValue<string>('#free_play_op');

    const client_seed = await this.getInputValue<string>('#next_client_seed');

    const pwc = await this.getInputValue<string>('#pwc_input');

    const cf_captcha_response = await this.getCfResponse('free_play');

    const params: TPostBodyParams = {
      op,
      fingerprint,
      client_seed,
      pwc,
      fingerprint2,
      cf_captcha_response
    };

    const playStatus = await this.postRequest('/', params);

    console.log({ playStatus, params });

    const [status, ...respData] = playStatus?.split(':') || [];

    if (status === 'e') {
      // Помилка
      const [errorCode, errorMessage, ...errorDetails] = respData;

      await this.reload();

      throw new Error(errorMessage);
    }

    // Успішна відповідь
    const [
      rollResult, // t[1]: Результат ролу
      balanceBTC, // t[2]: Баланс у BTC
      winnings, // t[3]: Виграші (наприклад, у сатошах)
      lastPlayTime, // t[4]: Час останньої гри
      balanceUSD, // t[5]: Баланс у USD
      nextServerSeedHash, // t[6]: Хеш наступного серверного сіда
      clientSeed, // t[11]: Клієнтський сид
      nonce, // t[12]: Нонс
      prevServerSeed, // t[9]: Попередній серверний сид
      prevServerSeedHash, // t[10]: Хеш попереднього серверного сіда
      prevRoll, // t[1]: Попередній рол
      lotteryTickets, // t[13]: Лотерейні квитки
      rewardPoints, // t[14]: Очки нагороди
      spinsWon, // t[15]: Кількість WOF спінів
      tokensWon, // t[20]: FUN токени
      ...rest // Інші додаткові дані
    ] = respData;

    await this.setCookie('last_play', lastPlayTime, {
      expires: 3650,
      secure: true
    });

    await this.reload();

    const result = {
      rollResult,
      balanceBTC,
      winnings,
      lastPlayTime, // Додано пропущене значення
      balanceUSD,
      nextServerSeedHash,
      clientSeed,
      nonce,
      prevServerSeed,
      prevServerSeedHash,
      prevRoll,
      lotteryTickets,
      rewardPoints,
      spinsWon,
      tokensWon,
      additionalData: rest
    };

    console.log({ result }, 'freePlay');
  }
}
