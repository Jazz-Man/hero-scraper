import getPublicIP from '@scraper/ip-info';
import SuperDocument from '@ulixee/awaited-dom/impl/super-klasses/SuperDocument';
import { OpenDnsAlternate } from '@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders';
import ExecuteJsPlugin from '@ulixee/execute-js-plugin';
import { type ISuperElement, KeyboardKey, type Tab } from '@ulixee/hero';
import CookieStorage from '@ulixee/hero/lib/CookieStorage';
import Hero from '@ulixee/hero/lib/Hero';
import { type ILocationTrigger } from '@ulixee/unblocked-specification/agent/browser/Location';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';

import type IUserProfile from '@ulixee/hero-interfaces/IUserProfile';
import type IWaitForElementOptions from '@ulixee/hero-interfaces/IWaitForElementOptions';
import Resource from '@ulixee/hero/lib/Resource';
import type IViewport from '@ulixee/unblocked-specification/agent/browser/IViewport';
import type IGeolocation from '@ulixee/unblocked-specification/plugin/IGeolocation';
import {
  type Fingerprint,
  FingerprintGenerator,
  type ScreenFingerprint
} from 'fingerprint-generator';
import { needsFree, needsInit, needsPageReady } from './classDecorators.ts';

import { safe, safePromise, type TSafePromiseOptions } from '@scraper/safe';
import type {
  THeroOptions,
  TInputValue,
  TSetCookieOptions,
  TTGotoOptions
} from './@types';
import { useValidURL } from './utils/useValidURL.ts';

export default abstract class HeroBase {
  protected isInitialised = false;
  protected isBusy = false;
  protected activeTab: Tab;
  protected document: SuperDocument;
  protected cookieStorage: CookieStorage;

  private reinitCount = 0;
  private reinitMaxCount = 3;

  protected profileCookies: ICookie[] | undefined;

  protected cookiesMap: Map<string, ICookie> = new Map();
  protected timeout = 30000;
  protected waitExistsTimeoutMs = this.timeout;
  private isPageReady = false;
  private createOption: THeroOptions | undefined;
  private initProfileCookies: ICookie[] | undefined;

  protected constructor() {}

  private _hero: Hero;

  get hero(): Hero {
    return this._hero;
  }

  getIsPageReady(): boolean {
    return this.isPageReady;
  }

  getIsInitialised() {
    return this.isInitialised;
  }

  getIsBusy() {
    return this.isBusy;
  }

  getIsFree() {
    return !this.isBusy;
  }

  @needsFree()
  // @makesBusy()
  async init(
    createOptions?: THeroOptions,
    profileCookies: ICookie[] | undefined = undefined
  ) {
    this.createOption = createOptions;
    this.initProfileCookies = profileCookies;

    this.profileCookies = this.prepareProfileCookies(this.initProfileCookies);

    const { country, ll, ip, timezone, proxy } = await getPublicIP();

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

    const fingerprint = await safePromise<Fingerprint>(
      () =>
        new FingerprintGenerator({
          mockWebRTC: true,
          browsers: ['chrome'],
          operatingSystems: ['macos'],
          devices: ['desktop'],
          httpVersion: '2'
        }).getFingerprint().fingerprint
    );

    const { navigator, screen } = fingerprint;

    const viewport = this.getViewport(screen);

    this._hero = await safePromise<Hero>(
      () =>
        new Hero({
          connectionToCore: {
            host: `ws://localhost:1818`
          },
          upstreamProxyUrl: proxy,
          upstreamProxyIpMask: {
            publicIp: ip,
            proxyIp: ip
          },
          userProfile: {
            cookies: this.profileCookies,
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
          ...this.createOption
        } as THeroOptions)
    );

    this._hero.use(ExecuteJsPlugin);

    this.initState();

    this.isInitialised = true;
  }

  private initState() {
    this.activeTab = this._hero.activeTab;
    this.document = this._hero.document;
    this.cookieStorage = this.activeTab.cookieStorage;
  }

  @needsPageReady()
  @needsInit()
  async setCookie(
    name: string,
    value: string,
    options: Omit<TSetCookieOptions, 'expires'> = {}
  ): Promise<void> {
    const expires = this.getOneYearFromNow();

    if (options.domain !== 'freebitco.in') {
      this.cookiesMap.set(name, {
        ...options,
        name: name,
        value,
        expires: expires.toString()
      });
    }

    const domains = ['.freebitco.in', 'freebitco.in'];

    for (const domain of domains) {
      await safe(
        this.cookieStorage.setItem(name, value, {
          domain: domain,
          path: '/',
          expires: expires,
          ...options
        })
      );
    }
  }

  @needsPageReady()
  @needsInit()
  async getProfileCookie(name: string) {
    let cookie: ICookie | undefined = undefined;

    if (this.cookiesMap.has(name)) {
      cookie = this.cookiesMap.get(name);
    }

    if (!cookie) {
      const _cookie = await safe<ICookie>(this.cookieStorage.getItem(name));

      if (_cookie.success && _cookie.data?.value?.length > 0) {
        cookie = _cookie.data;
      }
    }

    return cookie;
  }

  @needsInit()
  async goto(
    href: string,
    options: TTGotoOptions = {
      timeoutMs: this.timeout
    }
  ) {
    const url = useValidURL(href);

    if (!url) {
      throw new Error(`Invalid URL: ${href}`);
    }

    this.isPageReady = false;

    const goto = await safePromise<Resource>(
      this._hero.goto(url.toString(), options)
    );

    const response = goto.response;

    const statusCode = response.statusCode;

    if (statusCode > 500) {
      const e = new Error(
        `page "${url.toString()}" is not accessible: code ${statusCode}.`
      );

      if (this.reinitCount < this.reinitMaxCount) {
        this.reinitCount++;

        console.error(e);

        console.info('reinit');

        await this._hero.waitForMillis(1000);

        let cookies: ICookie[] | undefined | boolean =
          await this.getProfileCookies();

        if (!cookies) {
          cookies = this.initProfileCookies;
        }

        await this.init(this.createOption, cookies as ICookie[]);

        await this.goto(href, options);

        return;
      }

      throw e;
    }

    await this.waitForAllContentLoaded();
  }

  @needsInit()
  async reload() {
    this.isPageReady = false;
    await safePromise(
      this._hero.reload({
        timeoutMs: this.waitExistsTimeoutMs
      })
    );
    await this.waitForAllContentLoaded();
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

  @needsInit()
  @needsPageReady()
  async waitForExists(
    selector: string,
    options: IWaitForElementOptions = {
      timeoutMs: this.waitExistsTimeoutMs
    }
  ) {
    return safePromise<ISuperElement>(
      this.hero.document
        .querySelector(selector)
        .$waitForExists({ timeoutMs: options.timeoutMs, ...options }),
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
      this._hero.interact({
        click: { element, verification: 'exactElement' },
        type: content
      })
    );
  }

  @needsInit()
  @needsPageReady()
  async getJsValue<T>(path: string, options?: TSafePromiseOptions): Promise<T> {
    return safePromise<T>(this.hero.getJsValue<T>(path), options);
  }

  @needsInit()
  @needsPageReady()
  async getInputValue<T extends TInputValue = string>(
    selector: string,
    options: { waitExistsTimeout: number; timeout: number } = {
      waitExistsTimeout: this.waitExistsTimeoutMs,
      timeout: this.timeout
    }
  ): Promise<T> {
    const element = await this.waitForExists(selector, {
      timeoutMs: options.waitExistsTimeout
    });

    const startTime = Date.now();

    async function getValue(): Promise<T | undefined> {
      const value = (await element.value) as T;

      if (value?.toString()?.length > 0) {
        return value;
      } else if (Date.now() - startTime > options.timeout) {
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
  async querySelector(selector: string): Promise<ISuperElement> {
    return safePromise<ISuperElement>(() =>
      this.document.querySelector(selector)
    );
  }

  async isVisible(selector: string): Promise<boolean> {
    const element = await this.querySelector(selector);

    return element ? element.$isVisible : false;
  }

  async getProfileCookies(): Promise<ICookie[] | boolean> {
    const profile = await safePromise<IUserProfile>(
      this._hero.exportUserProfile()
    );

    if (!profile.cookies?.length) {
      return false;
    }

    return profile.cookies.filter((cookie) => cookie.name?.trim().length > 0);
  }

  /**
   * Performs Ctrl+A, then Backspace.
   *
   * Make sure you have a focused element before calling this.
   */
  @needsInit()
  protected async clearInput() {
    // select all text in input
    await safe(
      this._hero.interact(
        { keyDown: KeyboardKey.ControlLeft },
        { keyDown: KeyboardKey.A }
      )
    );
    await safe(
      this._hero.interact(
        { keyUp: KeyboardKey.A },
        { keyUp: KeyboardKey.ControlLeft }
      )
    );

    // delete all text in input
    await safe(this._hero.type(KeyboardKey.Backspace));
  }

  @needsInit()
  protected async waitForAllContentLoaded() {
    await safe<void>(
      this._hero.waitForLoad('AllContentLoaded', {
        timeoutMs: this.waitExistsTimeoutMs
      })
    );
    await safe<void>(
      this._hero.waitForPaintingStable({
        timeoutMs: this.waitExistsTimeoutMs
      })
    );

    await safe(this._hero.waitForMillis(5000)); // waits 5 seconds

    const currentUrl = await this._hero.url;

    this.initState();

    this.isPageReady = useValidURL(currentUrl) instanceof URL;
  }

  /**
   * Calls hero's waitForLocation and then waitForLoad.
   *
   * @param trigger The waitForLocation trigger
   */
  @needsInit()
  protected async waitForNavigation(trigger: ILocationTrigger = 'change') {
    this.isPageReady = false;
    await safe(
      this._hero.waitForLocation(trigger, {
        timeoutMs: this.timeout
      })
    );
    await this.waitForAllContentLoaded();
  }

  private generateCsrfToken(): string {
    const charSet2 =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString2 = '';
    let i;
    for (i = 0; i < 12; i++) {
      const randomPoz = Math.floor(Math.random() * charSet2.length);
      randomString2 += charSet2.substring(randomPoz, randomPoz + 1);
    }
    return randomString2;
  }

  private getOneYearFromNow(): number {
    const oneYearFromNow = new Date();

    return oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  }

  private fixCookiesExpires(cookie: ICookie): ICookie {
    if (typeof cookie.expires === 'undefined') {
      cookie.expires = this.getOneYearFromNow().toString();
    }

    if (typeof cookie.path === 'undefined') {
      cookie.path = '/';
    }

    return cookie;
  }

  private prepareProfileCookies(cookies: ICookie[] | undefined): ICookie[] {
    const list: ICookie[] = [];

    cookies?.forEach((cookie) => {
      if (cookie.domain === 'freebitco.in') {
        return;
      }

      this.cookiesMap.set(cookie.name, this.fixCookiesExpires(cookie));
    });

    const csrfToken = this.generateCsrfToken();

    this.cookiesMap.set(
      'csrf_token',
      this.fixCookiesExpires({
        name: 'csrf_token',
        value: csrfToken,
        secure: true
      })
    );

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

      this.cookiesMap.set(
        name,
        this.fixCookiesExpires({
          name,
          value: '1',
          secure: true
        })
      );
    }

    this.cookiesMap.set(
      'cookieconsent_dismissed',
      this.fixCookiesExpires({
        name: 'cookieconsent_dismissed',
        value: 'yes',
        secure: true
      })
    );

    this.cookiesMap.forEach((cookie, name) => {
      const domains = ['.freebitco.in', 'freebitco.in'];

      domains.forEach((domain) => {
        list.push({
          ...cookie,
          domain
        });
      });
    });

    return list;
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
