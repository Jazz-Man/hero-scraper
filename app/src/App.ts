import getPublicIP from '@scraper/ip-info';
import { type IHeroCreateOptions, type ISuperElement } from '@ulixee/hero';

import type IWaitForElementOptions from '@ulixee/hero-interfaces/IWaitForElementOptions';

// @ts-ignore
import IHeroMeta from '@ulixee/hero-interfaces/IHeroMeta';
import type IUserProfile from '@ulixee/hero-interfaces/IUserProfile';

import HeroBase, { type MaybeStringPromise } from './HeroBase.ts';

import type ISetCookieOptions from '@ulixee/hero-interfaces/ISetCookieOptions';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';

export type THeroOptions = IHeroCreateOptions;

export type TSetCookieOptions = Omit<ICookie, 'name' | 'value' | 'expires'> & {
  expires?: Date | number;
};

export type TJqCookie =
  | {
      expires?: number;
      path?: string;
      domain?: string;
      secure?: boolean;
    }
  | undefined;

export type TJqCookieValue = string | number;

type TAjaxResponse = {
  status: number;
  statusText: string;
  rawHeaders: string;
  responseJSON?: any;
  responseData?: any;
};

export default class App extends HeroBase {
  private isLoggedIn: boolean;
  constructor(
    protected username: string,
    protected password: string,
    protected showChrome = false
  ) {
    super();
  }

  async initCookie(): Promise<void> {
    await this.cookieStorage.clear();

    const hideCookies = ['mine_btc', 'earn_btc', 'push', 'free_wof_spins'];

    for (const cookie of hideCookies) {
      await this.hideCookieMsg(cookie);
    }

    await this.setCookie('cookieconsent_dismissed', 'yes', {
      secure: false
    });
  }

  async hideCookieMsg(message: string): Promise<void> {
    await this.setCookie(`hide_${message}_msg`, '1', {
      secure: true,
      expires: 3650
    });
  }

  setCookie = async (
    key: string,
    value: string,
    options: TSetCookieOptions = {}
  ): Promise<void> => {
    await this.cookieStorage.removeItem(key);

    if (typeof options?.expires === 'number') {
      const days = options.expires;
      const time = (options.expires = new Date());
      time.setMilliseconds(time.getMilliseconds() + days * 864e5);

      options.expires = time;
    }

    const domains = ['.freebitco.in', 'freebitco.in'];

    for (const domain of domains) {
      await this.cookieStorage.setItem(key, value, {
        domain: domain,
        path: '/',
        ...options
      } as ISetCookieOptions);
    }
  };

  getCookie = async (key: string) => await this.cookieStorage.getItem(key);

  public queryEl = async (
    selector: string,
    options?: IWaitForElementOptions
  ): Promise<ISuperElement | undefined> => {
    try {
      const element = this.document?.querySelector(selector);

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      return await this.activeTab?.waitForElement(element, options);
    } catch (e: any) {
      throw new Error(e);
    }
  };

  async jqCookie(
    name: string,
    value: TJqCookieValue | undefined = undefined,
    options: TJqCookie = undefined
  ) {
    return await this.hero.executeJs(
      (name, value, options) =>
        // @ts-ignore
        $.cookie(name, value, options),
      name,
      value,
      options
    );
  }

  async jqCookieSet(
    name: string,
    value: TJqCookieValue,
    options: TJqCookie = undefined
  ): Promise<void> {
    const domains = ['.freebitco.in', 'freebitco.in'];

    for (const domain of domains) {
      await this.jqCookie(name, value, {
        expires: 3650,
        secure: true,
        domain: domain,
        path: '/',
        ...options
      });
    }
  }

  async ajaxPost(
    url: string,
    data: Record<string, string | number>
  ): Promise<Response> {
    const res: TAjaxResponse = await this.hero.executeJs(
      // @ts-ignore
      (url, data) =>
        new Promise((resolve, reject) => {
          $.post(url, data)
            .done((responseData: any, textStatus: string, jqXHR: JQueryXHR) => {
              resolve({
                status: jqXHR.status,
                statusText: jqXHR.statusText,
                rawHeaders: jqXHR.getAllResponseHeaders(),
                responseJSON: jqXHR.responseJSON,
                responseData
              });
            })
            .fail(reject);
        }),
      url,
      data
    );

    // Визначаємо body для Response
    let body: BodyInit;
    if (res.responseJSON !== undefined) {
      // Якщо відповідь JSON, використовуємо responseJSON
      body = JSON.stringify(res.responseJSON);
    } else {
      // Інакше використовуємо текстову відповідь
      body = res.responseData;
    }

    const headers = new Headers(
      res.rawHeaders.split('\n').reduce(
        (acc, line) => {
          const [key, value] = line.split(': ');
          if (key && value) acc[key.trim()] = value.trim();
          return acc;
        },
        {} as Record<string, string>
      )
    );

    return new Response(body, {
      status: res.status,
      statusText: res.statusText,
      headers
    });
  }

  public clickEl = async (
    selector: string,
    queryOptions?: IWaitForElementOptions
  ) => {
    try {
      const element = await this.queryEl(selector, queryOptions);

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await this.hero?.interact({
        click: { element, verification: 'exactElement' }
      });
    } catch (e) {
      throw new Error(e);
    }
  };

  public typeInput = async (
    selector: string,
    content: string,
    queryOptions?: IWaitForElementOptions
  ) => {
    try {
      const element = await this.queryEl(selector, queryOptions);

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await this.hero.interact({
        click: { element, verification: 'exactElement' },
        type: content
      });
    } catch (e) {
      console.log('typeInput', e);
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

  public getCsrfToken = async (): MaybeStringPromise =>
    await this.getCookieValue('csrftoken');

  public exportUserProfile = async (): Promise<IUserProfile> =>
    await this.hero.exportUserProfile();

  public getMeta = async (): Promise<IHeroMeta> => await this.hero.meta;

  async login() {
    if (this.isLoggedIn) {
      throw new Error(`Already logged in to instagram, you must logout first.`);
    }
  }

  private getHeroOptions = async (createOptions?: THeroOptions) => {
    const { country, ll, ip, timezone, proxy } = await getPublicIP();

    const options: THeroOptions = {
      ...createOptions
    };
  };

  private getCookieValue = async (name: string): MaybeStringPromise =>
    await this.cookieStorage?.getItem(name)?.then((res) => res.value);
}
