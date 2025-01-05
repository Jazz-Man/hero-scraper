import HeroBase, {
  type MaybeStringPromise,
  type TSetCookieOptions
} from './HeroBase.ts';
import {
  needsCsrfToken,
  needsInit,
  needsPageReady
} from './classDecorators.ts';

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
            'free_wof_spins'
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

  public getInputValue = async (elementId: string): MaybeStringPromise =>
    await this.hero.executeJs(
      // @ts-ignore
      (id) => document.getElementById(id)?.value,
      elementId
    );

  public getWidgetId = async (): MaybeStringPromise =>
    await this.hero.executeJs(() => {
      const widgetId =
        // @ts-ignore
        typeof window.freeplay_form_turnstile_widget !== 'undefined'
          ? // @ts-ignore
            freeplay_form_turnstile_widget
          : // @ts-ignore
            typeof window.signup_form_turnstile_widget !== 'undefined'
            ? // @ts-ignore
              window.signup_form_turnstile_widget
            : undefined;

      return typeof widgetId === 'undefined' ? undefined : widgetId;
    });

  public getFingerprint = async (): MaybeStringPromise =>
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

  @needsInit()
  @needsPageReady()
  @needsCsrfToken()
  async login(tfa_code: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      if (this.isLoggedIn) {
        resolve(true);
        return;
      }

      const btc_address = await this.getCookieValue('btc_address');

      if (btc_address === this.username) {
        this.isLoggedIn = true;
        resolve(true);
        return;
      } else {
        const csrfToken = this.csrfToken as string;

        const params = new URLSearchParams();
        params.append('csrf_token', csrfToken);
        params.append('op', 'login_new');
        params.append('btc_address', this.username);
        params.append('password', this.password);
        params.append('tfa_code', tfa_code);

        let loginStatus: string = '';

        try {
          const request = new this.hero.Request('/', {
            method: 'POST',
            headers: {
              'content-type':
                'application/x-www-form-urlencoded; charset=UTF-8',
              'x-csrf-token': csrfToken
            },
            body: params.toString()
          });
          const response = await this.hero.fetch(request);

          loginStatus = await response.text();
        } catch (e) {
          reject(e);
        }

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
}
