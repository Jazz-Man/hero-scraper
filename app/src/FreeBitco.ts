import setCookie from 'set-cookie-parser';

import type { TUsersWithCookies } from '@scraper/db';
import { safe, safePromise } from '@scraper/safe';
import Response from '@ulixee/awaited-dom/impl/official-klasses/Response';
import { URLSearchParams } from 'node:url';
import type {
  TAccountCookie,
  TCfType,
  TCfTypeSelectors,
  TPostBodyParams
} from './@types';
import HeroBase from './HeroBase.ts';
import {
  needsCsrfToken,
  needsInit,
  needsLogin,
  needsPageReady
} from './classDecorators.ts';
import getOtp from './otp.ts';

export default class FreeBitco extends HeroBase {
  private isLoggedIn: boolean = false;
  private csrfToken: string | undefined;

  constructor(
    baseUrl: string,
    protected user: TUsersWithCookies
  ) {
    super(baseUrl);
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
  async initCookie(): Promise<void> {
    const hasInitCookie = await this.app.getCookie('init');

    if (!hasInitCookie) {
      const hideCookiesList: string[] = [
        'mine_btc',
        'earn_btc',
        'push',
        'free_wof_spins',
        'premium_membership',
        'rp_for_wof'
      ];

      for (const cookie of hideCookiesList) {
        const name = `hide_${cookie}_msg`;

        await this.app.setCookie(name, '1', {
          secure: true
        });
      }

      await this.app.setCookie('cookieconsent_dismissed', '1', {
        secure: true
      });

      await this.app.setCookie('init', '1', {
        secure: true
      });

      await this.reload();
    }

    const csrfTokenCookie = await this.app.getCookie('csrf_token');

    if (csrfTokenCookie) {
      this.csrfToken = csrfTokenCookie.value;
    }

    const btc_address = await this.app.getCookie('btc_address');

    if (btc_address) {
      this.isLoggedIn = true;
      console.log({ btc_address, isLoggedIn: this.isLoggedIn }, 'initCookie');
      return;
    }

    return;
  }

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
  @needsCsrfToken()
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
          await this.app.setCookie(cookie.name, cookie.value, {
            secure: cookie.secure,
            httpOnly: cookie.httpOnly
          });
        }
      }

      const text = await safePromise(response.text());
      resolve(text);
    });
  }

  private async initAccountCookie(cookie: TAccountCookie) {
    await this.app.setCookie('btc_address', cookie.btc_address, {
      secure: true
    });
    await this.app.setCookie('password', cookie.password, {
      secure: true
    });
    await this.app.setCookie('fbtc_userid', cookie.fbtc_userid, {
      secure: true
    });

    await this.app.setCookie('fbtc_session', cookie.fbtc_session, {
      secure: true
    });

    await this.app.setCookie('have_account', '1', {
      secure: true
    });

    this.isLoggedIn = true;

    await this.goto('https://freebitco.in/?op=home');
  }

  @needsInit()
  @needsPageReady()
  async login(): Promise<boolean> {
    if (this.isLoggedIn) {
      console.log('login ok', { isLoggedIn: this.isLoggedIn });
      return true;
    }

    const params: TPostBodyParams = {
      op: 'login_new',
      btc_address: this.user.username,
      password: this.user.password
    };

    if (this.user.tfa_secret) {
      params.tfa_code = getOtp(this.user.tfa_secret);
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
  }

  @needsInit()
  @needsPageReady()
  async signup(referrer: string | undefined = undefined) {
    const fingerprint = await this.getFingerprintMd5();

    const cf_captcha_response = await this.getTurnstileResponse('signup_form');

    const params: TPostBodyParams = {
      op: 'signup_new',
      password: this.user.password,
      email: this.user.username,
      fingerprint,
      captcha_type: '77',
      cf_captcha_response
    };

    if (referrer) {
      params.referrer = referrer;
    }

    const signupStatus = await this.postRequest('/', params);

    const [status, ...signupData] = signupStatus?.split(':');

    console.log({ status, signupData, params }, 'signupStatus');

    if (status === 'e') {
      const isEmailExists =
        signupData?.at(1) && signupData[1] === 'email_exists';

      const error = isEmailExists ? signupData[0] : signupData[0];

      throw new Error(error);
    }

    const [btc_address, password, fbtc_userid, fbtc_session] = signupData;

    await this.initAccountCookie({
      btc_address,
      password,
      fbtc_userid,
      fbtc_session
    });
  }

  @needsInit()
  @needsPageReady()
  async getTurnstileResponse<T extends string>(type: TCfType): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const selectors: TCfTypeSelectors = {
        free_play: '#freeplay_form_cf_turnstile',
        signup_form: '#signup_form_cf_turnstile'
      };

      if (!selectors.hasOwnProperty(type)) {
        reject(new Error(`invalid cf type: ${type}`));

        return;
      }

      const selector = `${selectors[type]} [name='cf-turnstile-response']`;

      const frames = await this.activeTab.frameEnvironments;

      for (const frame of frames) {
        const isMainFrame = await frame.isMainFrame;
        if (isMainFrame) {
          continue;
        }

        const frameUrl = await frame.url;

        if (!frameUrl.includes('challenges.cloudflare.com')) {
          continue;
        }

        const body = frame.document.body;

        const isVisible = await body.$isVisible;

        if (!isVisible) {
          continue;
        }

        const checkbox = body.shadowRoot?.querySelector(
          'div.main-wrapper label.cb-lb'
        );

        if (await checkbox?.$isVisible) {
          await checkbox?.click();

          await this.hero.waitForMillis(1000);
        }
      }
      // } catch (e) {
      //   console.error(e);
      // }

      const value = await this.getInputValue<T>(selector);

      resolve(value);
    });
  }
  @needsLogin()
  async freePlay() {
    const timeRemainingExists = await this.isVisible('#free_play_tab #wait');

    if (timeRemainingExists) {
      console.log({ timeRemainingExists });
      return;
    }

    const playBtn = await this.queryElement('#free_play_form_button', {
      waitForVisible: true
    });

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

    const cf_captcha_response = await this.getTurnstileResponse('free_play');

    const params: TPostBodyParams = {
      op,
      fingerprint,
      client_seed,
      pwc,
      fingerprint2,
      cf_captcha_response
    };

    console.log(params);

    // const playStatus = await this.postRequest('/', params);
    //
    // console.log({ playStatus, params });
    //
    // const [status, ...respData] = playStatus?.split(':') || [];
    //
    // if (status === 'e') {
    //   // Помилка
    //   const [errorCode, errorMessage, ...errorDetails] = respData;
    //
    //   await this.reload();
    //
    //   throw new Error(errorMessage);
    // }
    //
    // // Успішна відповідь
    // const [
    //   rollResult, // t[1]: Результат ролу
    //   balanceBTC, // t[2]: Баланс у BTC
    //   winnings, // t[3]: Виграші (наприклад, у сатошах)
    //   lastPlayTime, // t[4]: Час останньої гри
    //   balanceUSD, // t[5]: Баланс у USD
    //   nextServerSeedHash, // t[6]: Хеш наступного серверного сіда
    //   clientSeed, // t[11]: Клієнтський сид
    //   nonce, // t[12]: Нонс
    //   prevServerSeed, // t[9]: Попередній серверний сид
    //   prevServerSeedHash, // t[10]: Хеш попереднього серверного сіда
    //   prevRoll, // t[1]: Попередній рол
    //   lotteryTickets, // t[13]: Лотерейні квитки
    //   rewardPoints, // t[14]: Очки нагороди
    //   spinsWon, // t[15]: Кількість WOF спінів
    //   tokensWon, // t[20]: FUN токени
    //   ...rest // Інші додаткові дані
    // ] = respData;
    //
    // await this.setCookie('last_play', lastPlayTime, {
    //   secure: true
    // });
    //
    // await this.reload();
    //
    // const result = {
    //   rollResult,
    //   balanceBTC,
    //   winnings,
    //   lastPlayTime, // Додано пропущене значення
    //   balanceUSD,
    //   nextServerSeedHash,
    //   clientSeed,
    //   nonce,
    //   prevServerSeed,
    //   prevServerSeedHash,
    //   prevRoll,
    //   lotteryTickets,
    //   rewardPoints,
    //   spinsWon,
    //   tokensWon,
    //   additionalData: rest
    // };
    //
    // console.log({ result }, 'freePlay');
  }
}
