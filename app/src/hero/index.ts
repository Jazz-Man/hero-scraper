import type { TSameSiteCookie, TUserCookies } from '@scraper/db';
import getPublicIP from '@scraper/ip-info';
import { safe, safePromise, type TSafePromiseOptions } from '@scraper/safe';
import type {
  IRequestInfo,
  IRequestInit
} from '@ulixee/awaited-dom/base/interfaces/official';
import type Response from '@ulixee/awaited-dom/impl/official-klasses/Response';
import { OpenDnsAlternate } from '@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders';
import ExecuteJsPlugin from '@ulixee/execute-js-plugin';
import { type ISuperElement, type Tab } from '@ulixee/hero';
import type ISetCookieOptions from '@ulixee/hero-interfaces/ISetCookieOptions';
import type IWaitForElementOptions from '@ulixee/hero-interfaces/IWaitForElementOptions';
import CookieStorage from '@ulixee/hero/lib/CookieStorage';
import Hero from '@ulixee/hero/lib/Hero';
import Resource from '@ulixee/hero/lib/Resource';
import type IViewport from '@ulixee/unblocked-specification/agent/browser/IViewport';
import type { ILocationTrigger } from '@ulixee/unblocked-specification/agent/browser/Location';
import type { IMousePositionXY } from '@ulixee/unblocked-specification/agent/interact/IInteractions';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import type IGeolocation from '@ulixee/unblocked-specification/plugin/IGeolocation';
import {
  type Fingerprint,
  FingerprintGenerator,
  type ScreenFingerprint
} from 'fingerprint-generator';
import type { THeroOptions, TInputValue } from '../@types';
import {
  DecoratorBaseClass,
  needsInit,
  needsPageReady
} from '../utils/classDecorators.ts';
import { useValidURL } from '../utils/useValidURL.ts';

type TTimeoutMsOptions = {
  timeoutMs?: number;
};

type TTGotoOptions = {
  referrer?: string;
} & TTimeoutMsOptions;

class Error4xx extends Error {
  public is4xxError: boolean;
  constructor(
    public response: Response,
    message: string
  ) {
    super(message);
    this.name = '4xxError';
    this.is4xxError = true;
  }
}

class Error5xx extends Error {
  public is4xxError: boolean;
  constructor(
    public response: Response,
    message: string
  ) {
    super(message);
    this.name = '5xxError';
    this.is4xxError = true;
  }
}

export interface IInitProfileCookies extends Omit<ICookie, 'expires'> {
  expires?: Date | null;
}

export type TProfileCookiesSet = Omit<IInitProfileCookies, 'name' | 'value'>;

export type THeroAppOptions = {
  baseUrl: string;
  createOptions?: THeroOptions;
  profileCookies?: TUserCookies;
  reinitWaitMs?: number; // default: 3?
  reinitMaxCount?: number; // default: 3?

  timeoutMs?: number; // default: 30000
  waitExistsTimeoutMs?: number; // default: this.timeoutMs
  waitForContentLoadedMs?: number; // default: this.timeoutMs
};

export default class HeroApp extends DecoratorBaseClass {
  private timezone: string | undefined;
  private readonly oneYearFromNow: Date;
  private readonly cookiesDomain: string;
  private readonly createOptions: THeroOptions | undefined = undefined;
  private readonly profileCookies: TUserCookies | undefined;
  private readonly timeoutMs: number = 30000;
  private readonly waitExistsTimeoutMs: number = this.timeoutMs;
  private readonly waitForContentLoadedMs: number;
  private readonly reinitWaitMs: number;
  private baseUrl: URL;
  private reinitCount = 0;
  private reinitMaxCount = 3;
  private hero: Hero;

  constructor(private options: THeroAppOptions) {
    super();
    this.timeoutMs = this.options.timeoutMs || 30000;
    this.waitExistsTimeoutMs =
      this.options.waitExistsTimeoutMs || this.timeoutMs;
    this.waitExistsTimeoutMs =
      this.options.waitExistsTimeoutMs || this.timeoutMs;

    this.reinitWaitMs = this.options.reinitWaitMs || 1000;

    this.waitForContentLoadedMs = this.options.waitForContentLoadedMs || 5000;
    this.createOptions = this.options.createOptions || undefined;
    this.profileCookies = this.options.profileCookies || undefined;

    try {
      this.baseUrl = new URL(this.options.baseUrl);

      const hostname = this.baseUrl.hostname;

      this.cookiesDomain = hostname.startsWith('www.')
        ? `.${hostname.replace(/^www\./, '')}`
        : hostname;
    } catch (e) {
      throw new Error(`Invalid URL: ${this.options.baseUrl}`);
    }

    this.oneYearFromNow = new Date();
    this.oneYearFromNow.setFullYear(this.oneYearFromNow.getFullYear() + 1);
  }

  private _activeTab: Tab;

  get activeTab(): Tab {
    return this._activeTab;
  }

  private _cookieStorage: CookieStorage;

  get cookieStorage(): any {
    return this._cookieStorage;
  }

  static async init(options: THeroAppOptions) {
    const app = new HeroApp(options);
    return await app.getHero();
  }

  async getHero(): Promise<Hero> {
    const { country, ll, ip, timezone, proxy } = await getPublicIP();

    this.timezone = timezone;

    const intLocale = safe<string>(() =>
      new Intl.Locale(country as unknown as string, {
        region: country as unknown as string
      }).toString()
    );

    const locale = intLocale.success ? intLocale.data : undefined;

    let geolocation: Partial<IGeolocation> | undefined = undefined;

    if (ll) {
      const latitude: number | undefined = ll.at(0);
      const longitude: number | undefined = ll.at(1);

      if (latitude && !(Math.abs(latitude) <= 90)) {
        geolocation = {};

        geolocation.latitude = latitude;
      }

      if (longitude && !(Math.abs(longitude) <= 180)) {
        geolocation = geolocation || {};
        geolocation.longitude = longitude;
      }
    }

    const fingerprint = await this.getFingerprint();

    const { navigator, screen } = fingerprint;

    const viewport = this.getViewport(screen);

    this.hero = new Hero({
      connectionToCore: {
        host: `ws://localhost:1818`
      },
      upstreamProxyUrl: proxy,
      upstreamProxyIpMask: {
        publicIp: ip,
        proxyIp: ip
      },
      userProfile: {
        cookies: this.prepareProfileCookies(this.profileCookies),
        timezoneId: timezone,
        locale,
        geolocation,
        deviceProfile: {
          deviceMemory: navigator.deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency,
          viewport
        }
      },
      viewport,
      dnsOverTlsProvider: OpenDnsAlternate,
      locale,
      geolocation,
      timezoneId: timezone,
      sessionKeepAlive: false,
      sessionPersistence: false,
      showChromeInteractions: false,
      mode: 'production',
      ...this.createOptions
    } as THeroOptions);

    this.hero.use(ExecuteJsPlugin);

    this._activeTab = this.hero.activeTab;
    this._cookieStorage = this._activeTab.cookieStorage;

    this.isInitialised = true;

    return this.hero;
  }

  async waitForMillis(ms: number = 1000) {
    await safe(this.hero.waitForMillis(ms));
  }

  @needsInit()
  async handleTurnstileChallenge(waitForContentLoaded: boolean = true) {
    if (waitForContentLoaded) {
      await this.waitForContentLoaded(false);
    }

    const frames = await this.activeTab.frameEnvironments;

    for (const frame of frames) {
      const isMainFrame = await frame.isMainFrame;
      const url = await frame.url;

      if (isMainFrame) {
        continue;
      }

      if (!url.includes('challenges.cloudflare.com')) {
        continue;
      }

      const body = frame.document.body;

      const isVisible = await body.$isVisible;

      if (!isVisible) {
        continue;
      }

      const bodyRect = await body.getBoundingClientRect();

      const mousePosition: IMousePositionXY = [
        await bodyRect.x,
        await bodyRect.y
      ];

      await this.hero.interact({
        scroll: mousePosition
      });

      const checkbox = body.shadowRoot?.querySelector(
        'div.main-wrapper label.cb-lb'
      );

      if (await checkbox?.$isVisible) {
        await checkbox?.click();

        await this.hero.waitForMillis(1000);

        if (waitForContentLoaded) {
          await this.waitForNavigation('reload');
        }
      }
    }
  }

  @needsInit()
  async goto(
    href: string,
    options: TTGotoOptions = {
      timeoutMs: this.timeoutMs
    }
  ) {
    const url = useValidURL(href);

    if (!url) {
      throw new Error(`Invalid URL: ${href}`);
    }

    this.isPageReady = false;

    const goto = await safePromise<Resource>(
      this.hero.goto(url.toString(), options)
    );

    const response = goto.response;

    const statusCode = response.statusCode;

    if (statusCode >= 500) {
      const e = new Error(
        `page "${url.toString()}" is not accessible: code ${statusCode}.`
      );

      if (this.reinitCount < this.reinitMaxCount) {
        this.reinitCount++;

        console.error(e);

        console.info('reinit');

        await this.hero.waitForMillis(this.reinitWaitMs);

        await this.hero.close();

        this.hero = await HeroApp.init(this.options);

        await this.goto(href, options);

        return;
      }

      await this.hero.close();

      throw e;
    } else if (statusCode === 403) {
      await this.handleTurnstileChallenge();
    }

    await this.waitForContentLoaded();
  }

  @needsInit()
  @needsPageReady()
  async getJsValue<T>(path: string, options?: TSafePromiseOptions): Promise<T> {
    return safePromise<T>(this.hero.getJsValue<T>(path), options);
  }

  @needsInit()
  @needsPageReady()
  async querySelector(selector: string): Promise<ISuperElement> {
    return safePromise<ISuperElement>(() => this.hero.querySelector(selector));
  }

  async isVisible(selector: string): Promise<boolean> {
    const element = await this.querySelector(selector);

    return element ? element.$isVisible : false;
  }

  @needsInit()
  async reload() {
    this.isPageReady = false;
    await safePromise(
      this.hero.reload({
        timeoutMs: this.waitExistsTimeoutMs
      })
    );
    await this.waitForContentLoaded();
  }

  @needsInit()
  async waitForContentLoaded(setPageReady: boolean = true) {
    await safe<void>(
      this.hero.waitForLoad('AllContentLoaded', {
        timeoutMs: this.waitExistsTimeoutMs
      })
    );
    await safe<void>(
      this.hero.waitForPaintingStable({
        timeoutMs: this.waitExistsTimeoutMs
      })
    );

    await safe(this.hero.waitForMillis(this.waitForContentLoadedMs));

    if (setPageReady) {
      const currentUrl = await this.hero.url;

      this.isPageReady = useValidURL(currentUrl) instanceof URL;
    }
  }

  async queryElement(
    selector: string,
    options?: IWaitForElementOptions
  ): Promise<ISuperElement> {
    const element = await this.querySelector(selector);

    return safePromise<ISuperElement>(
      this.activeTab.waitForElement(element, {
        timeoutMs: this.waitExistsTimeoutMs,
        ...options
      })
    );
  }

  async getInputValue<T extends TInputValue = string>(
    selector: string,
    timeout: number = this.timeoutMs
  ): Promise<T> {
    const element = await this.waitForExists(selector, {
      timeoutMs: this.waitExistsTimeoutMs
    });

    const startTime = Date.now();

    async function getValue(): Promise<T | undefined> {
      const value = (await element.value) as T;

      if (value?.toString()?.length > 0) {
        return value;
      } else if (Date.now() - startTime > timeout) {
        throw new Error(`Get Input Value timeout: "${selector}"`);
      } else {
        setTimeout(async () => await getValue(), 1000);
      }
    }

    const value = await safePromise<T | undefined>(getValue());

    return value as T;
  }

  @needsInit()
  @needsPageReady()
  async waitForExists(selector: string, options?: IWaitForElementOptions) {
    return safePromise<ISuperElement>(
      this.hero.document
        .querySelector(selector)
        .$waitForExists({ timeoutMs: this.waitExistsTimeoutMs, ...options }),
      {
        err: `Wait for exists: "${selector}"`
      }
    );
  }

  async clickElement(selector: string, queryOptions?: IWaitForElementOptions) {
    const element = await this.queryElement(selector, queryOptions);
    await safe(
      this.hero.interact({
        click: { element, verification: 'exactElement' }
      })
    );
  }

  async typeInput(
    selector: string,
    content: string,
    queryOptions?: IWaitForElementOptions
  ) {
    const element = await this.queryElement(selector, queryOptions);
    await safe(
      this.hero.interact({
        click: { element, verification: 'exactElement' },
        type: content
      })
    );
  }

  /**
   * Calls hero's waitForLocation and then waitForLoad.
   *
   * @param trigger The waitForLocation trigger
   */
  @needsInit()
  async waitForNavigation(trigger: ILocationTrigger = 'change') {
    this.isPageReady = false;
    await safe(
      this.hero.waitForLocation(trigger, {
        timeoutMs: this.timeoutMs
      })
    );
    await this.waitForContentLoaded();
  }

  @needsPageReady()
  @needsInit()
  async fetch(_input: IRequestInfo, _init?: IRequestInit): Promise<Response> {
    const request = new this.hero.Request(_input, {
      credentials: 'include',
      mode: 'cors',
      referrerPolicy: 'strict-origin-when-cross-origin',
      redirect: 'follow',
      ..._init
    });

    return safePromise(this.hero.fetch(request), {
      logError: true
    });
  }

  @needsPageReady()
  @needsInit()
  async setCookie(
    name: string,
    value: string,
    options: TProfileCookiesSet = {}
  ) {
    return await this.cookieStorage.setItem(
      name,
      value,
      this.prepareProfileCookie(
        options as IInitProfileCookies
      ) as ISetCookieOptions
    );
  }

  @needsPageReady()
  @needsInit()
  async getCookie(key: string): Promise<ICookie> {
    return await this.cookieStorage.getItem(key);
  }

  @needsPageReady()
  @needsInit()
  async deleteCookie(key: string): Promise<boolean> {
    return await this.cookieStorage.removeItem(key);
  }

  @needsPageReady()
  @needsInit()
  async getAllCookies(): Promise<ICookie[]> {
    return await this.cookieStorage.getItems();
  }

  @needsPageReady()
  @needsInit()
  async exportCookies(): Promise<TUserCookies | undefined> {
    const profile = await this.hero.exportUserProfile();

    // @ts-ignore
    return profile.cookies
      ?.filter(
        (cookie) => cookie.name?.length > 0 && cookie.name !== 'undefined'
      )
      ?.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain as string,
        path: cookie.path as string,
        expires: cookie.expires,
        secure: cookie.secure as boolean,
        httpOnly: cookie.httpOnly as boolean,
        sameSite: cookie.sameSite as TSameSiteCookie,
        sameParty: cookie.sameParty as boolean
      }));
  }

  private async getFingerprint(): Promise<Fingerprint> {
    return new Promise<Fingerprint>((resolve, reject) => {
      try {
        const fingerprint = new FingerprintGenerator({
          mockWebRTC: true,
          browsers: ['chrome'],
          operatingSystems: ['macos'],
          devices: ['desktop'],
          httpVersion: '2'
        }).getFingerprint().fingerprint;

        resolve(fingerprint);
      } catch (e) {
        reject(e);
      }
    });
  }

  private fixDateWithTimezone = (
    date?: Date | number | undefined
  ): Date | undefined => {
    try {
      let _date: Date | undefined = undefined;

      if (typeof date === 'number') {
        _date = new Date(date);
      } else if (date instanceof Date) {
        _date = date;
      }

      if (_date instanceof Date) {
        const localDate = _date.toLocaleString('en-US', {
          timeZone: this.timezone,
          timeZoneName: 'longOffset',
          hour12: false
        });

        return new Date(localDate);
      }

      return undefined;
    } catch (e) {
      throw e;
    }
  };

  private prepareProfileCookie(cookie: IInitProfileCookies) {
    cookie.domain = cookie.domain || this.cookiesDomain;
    cookie.expires = this.fixDateWithTimezone(
      cookie?.expires || this.oneYearFromNow
    );

    cookie.path = cookie.path || '/';

    return cookie;
  }

  private prepareProfileCookies(
    cookies: IInitProfileCookies[] | undefined = undefined
  ): IInitProfileCookies[] | undefined {
    if (cookies?.length === 0) {
      return undefined;
    }

    return cookies?.map((cookie) => this.prepareProfileCookie(cookie));
  }

  private getViewport(screen: ScreenFingerprint): IViewport {
    return {
      positionX: screen.pageXOffset,
      positionY: screen.pageYOffset,
      height: screen.height,
      width: screen.width,
      screenWidth: screen.availWidth,
      screenHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      deviceScaleFactor: screen.devicePixelRatio,
      isDefault: true
    };
  }
}
