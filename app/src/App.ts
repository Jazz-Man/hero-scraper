import HeroBase, {
  type MaybeStringPromise,
  type TSetCookieOptions
} from './HeroBase.ts';
import {
  needsCsrfToken,
  needsInit,
  needsLogin,
  needsPageReady
} from './classDecorators.ts';

type TCfType = 'free_play' | 'signup_form';

type TCfTypeSelectors = Record<TCfType, string>;

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

  getIsLoggedIn() {
    return this.isLoggedIn;
  }

  @needsInit()
  @needsPageReady()
  async initCookie(): Promise<boolean> {
    return new Promise(async (resolve, rejects) => {
      try {
        this.csrfToken = await this.getCookieValue('csrf_token');

        const profile = this.profileCookies;

        if (profile?.length) {
          this.csrfToken = profile.find(
            (cookie) =>
              cookie.name === 'csrf_token' &&
              cookie.path === '/' &&
              cookie.domain === '.freebitco.in'
          )?.value;

          this.isLoggedIn = true;

          resolve(true);
        } else {
          const btc_address = await this.getCookieValue('btc_address');

          if (btc_address === this.username) {
            this.isLoggedIn = true;
            resolve(true);
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

          resolve(true);
        }
      } catch (e) {
        rejects(e);
      }
    });
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

  public getFingerprintMd5 = async (): MaybeStringPromise =>
    await this.hero.getJsValue<string>(`$.fingerprint()`);

  public getFingerprintT = async (): MaybeStringPromise =>
    await this.hero.executeJs(() => {
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
    });

  @needsInit()
  @needsPageReady()
  async exportUserProfile() {
    return await this.hero.exportUserProfile();
  }

  @needsPageReady()
  @needsCsrfToken()
  async postRequest(
    url: string,
    bodyParams: Record<string, string>
  ): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const csrfToken = this.csrfToken as string;

        const params = new URLSearchParams(bodyParams);

        if (!params.has('csrf_token')) {
          params.set('csrf_token', csrfToken);
        }

        const request = new this.hero.Request(url, {
          credentials: 'include',
          redirect: 'follow',
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-csrf-token': csrfToken
          },
          body: params.toString()
        });
        const response = await this.hero.fetch(request);
        const text = await response.text();
        resolve(text);
      } catch (e) {
        reject(e);
      }
    });
  }

  @needsInit()
  @needsPageReady()
  @needsCsrfToken()
  async login(tfa_code: string | undefined = undefined): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (this.isLoggedIn) {
        resolve(true);
        return;
      }

      const btc_address = await this.getCookieValue('btc_address');

      if (btc_address?.length) {
        this.isLoggedIn = true;
        resolve(true);
        return;
      } else {
        const params: Record<string, string> = {
          op: 'login_new',
          btc_address: this.username,
          password: this.password
        };

        if (tfa_code) {
          params.tfa_code = tfa_code;
        }

        const loginStatus = await this.postRequest('/', params);

        console.log({ loginStatus });

        const [status, ...loginData] = loginStatus?.split(':');

        if (status !== 's') {
          reject(loginData[0]);
        } else {
          const [btc_address, password, fbtc_userid, fbtc_session] = loginData;

          await this.setCookie('btc_address', btc_address, {
            expires: 3650,
            secure: true
          });
          await this.setCookie('password', password, {
            expires: 3650,
            secure: true
          });
          await this.setCookie('fbtc_userid', fbtc_userid, {
            expires: 3650,
            secure: true
          });

          await this.setCookie('fbtc_session', fbtc_session, {
            expires: 3650,
            secure: true
          });

          await this.setCookie('have_account', '1', {
            expires: 3650,
            secure: true
          });

          this.isLoggedIn = true;

          await this.goto('https://freebitco.in/?op=home');

          resolve(true);
        }
      }
    });
  }

  async getCfResponse(type: TCfType): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const selector: TCfTypeSelectors = {
        free_play: '#freeplay_form_cf_turnstile',
        signup_form: '#signup_form_cf_turnstile'
      };

      if (!selector.hasOwnProperty(type)) {
        reject('invalid type');

        return;
      }

      try {
        const value = await this.getInputValue(
          `${selector[type]} [name='cf-turnstile-response']`
        );

        resolve(value);
      } catch (e) {
        reject(e);
      }
    });
  }

  @needsInit()
  @needsPageReady()
  @needsLogin()
  async freePlay() {
    return new Promise(async (resolve, reject) => {
      try {
        const timeRemainingExists = await this.querySelector(
          '#free_play_tab #wait #time_remaining'
        ).then((el) => el.$exists);

        if (timeRemainingExists) {
          resolve(true);
        }

        const playBtn = await this.queryElement('#free_play_form_button');

        await this.hero.interact({
          scroll: playBtn
        });

        const fingerprint = await this.getFingerprintMd5();

        if (!fingerprint) {
          reject('fingerprint not found');
          return;
        }

        const fingerprint2 = await this.getFingerprintT();

        if (!fingerprint2) {
          reject('fingerprint2 not found');
          return;
        }

        const op = await this.getInputValue<string>('#free_play_op');

        const client_seed =
          await this.getInputValue<string>('#next_client_seed');

        const pwc = await this.getInputValue<string>('#pwc_input');

        const cf_captcha_response = await this.getCfResponse('free_play');

        const params: Record<string, string> = {
          op,
          fingerprint,
          client_seed,
          pwc,
          fingerprint2,
          cf_captcha_response
        };

        const playStatus = await this.postRequest('/', params);

        console.log({ playStatus });

        const [status, ...respData] = playStatus?.split(':') || [];

        if (status === 's') {
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

          resolve({
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
          });
        } else if (status === 'e') {
          // Помилка
          const [errorCode, errorMessage, ...errorDetails] = respData;

          console.error('Помилка:', {
            errorCode,
            errorMessage,
            errorDetails
          });

          if (errorCode === 'e1') {
            console.log('Та ж сама IP адреса. Чекаємо таймер...');
            const timeRemaining = parseInt(errorDetails[0], 10);
            console.log(`Залишок часу: ${timeRemaining} секунд`);
            setTimeout(async () => {
              console.log('Оновлюємо сторінку...');
              await this.reload();
              await this.freePlay();
            }, timeRemaining * 1000);
          } else {
            reject(errorMessage);
          }
        }

        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }
}
