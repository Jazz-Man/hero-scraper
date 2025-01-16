import getPublicIP from '@scraper/ip-info';
import SuperDocument from '@ulixee/awaited-dom/impl/super-klasses/SuperDocument';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import { OpenDnsAlternate } from '@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders';
import ExecuteJsPlugin from '@ulixee/execute-js-plugin';
import {
  type IHeroCreateOptions,
  type ISuperElement,
  KeyboardKey,
  type Tab
} from '@ulixee/hero';
import CookieStorage from '@ulixee/hero/lib/CookieStorage';
import Hero from '@ulixee/hero/lib/Hero';
import type { ILocationTrigger } from '@ulixee/unblocked-specification/agent/browser/Location';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';

import { safeOverwriteFile } from '@ulixee/commons/lib/fileUtils';
import type ISetCookieOptions from '@ulixee/hero-interfaces/ISetCookieOptions';
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
import { existsSync, readFileSync } from 'node:fs';
import Path from 'path';
import { needsFree, needsInit, needsPageReady } from './classDecorators.ts';

import { safe, safePromise, type TSafePromiseOptions } from '@scraper/safe';
import { useValidURL } from './utils/useValidURL.ts';

export type THeroOptions = IHeroCreateOptions;

export type MaybeUndefinedPromise<T> = Promise<T | undefined>;
export type MaybeStringPromise = MaybeUndefinedPromise<string>;

export type TSetCookieOptions = Omit<ICookie, 'name' | 'value' | 'expires'> & {
  expires?: Date | number;
};

export type TInputValue = string | number;

export default abstract class HeroBase {
  protected isInitialised = false;
  protected isBusy = false;
  protected activeTab: Tab;
  protected document: SuperDocument;
  protected cookieStorage: CookieStorage;
  protected profileCookies: ICookie[] | undefined;
  private isPageReady = false;
  private readonly tmpDir: string;

  private readonly profilePath: string;

  protected constructor() {
    this.tmpDir = Path.join(__dirname, '../../.tmp');

    this.profilePath = Path.join(this.tmpDir, 'profile-test.json');
  }

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
  async init(createOptions?: THeroOptions) {
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

    this.profileCookies = await this.getProfileCookies();

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
          ...createOptions
        } as THeroOptions)
    );

    this._hero.use(ExecuteJsPlugin);

    this.activeTab = this._hero.activeTab;
    this.document = this._hero.document;
    this.cookieStorage = this.activeTab.cookieStorage;

    this.isInitialised = true;
  }

  @needsPageReady()
  @needsInit()
  async setCookie(
    key: string,
    value: string,
    options: TSetCookieOptions = {}
  ): Promise<void> {
    if (typeof options?.expires === 'number') {
      const days = options.expires;
      const time = (options.expires = new Date());
      time.setMilliseconds(time.getMilliseconds() + days * 864e5);

      options.expires = time;
    }

    await safe(
      this.cookieStorage.setItem(key, value, options as ISetCookieOptions)
    );
  }

  @needsPageReady()
  @needsInit()
  async getCookie(key: string): Promise<ICookie> {
    return safePromise<ICookie>(this.cookieStorage.getItem(key));
  }

  async getCookieValue(key: string): MaybeStringPromise {
    const cookie = await this.getCookie(key);

    return cookie?.value;
  }

  @needsInit()
  async goto(
    href: string,
    options?: {
      timeoutMs?: number;
      referrer?: string;
    }
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        this.isPageReady = false;

        const goto = await safePromise<Resource>(
          this._hero.goto(href, options)
        );

        const response = goto.response;

        const statusCode = response.statusCode;

        if (statusCode > 500) {
          const headers = response.headers;
          const statusMessage = response.statusMessage;
          const statusMessage2 = await response.text;

          const error = new Error('page is not accessible: code ' + statusCode);

          // console.log({
          //   statusCode,
          //   statusMessage,
          //   headers,
          //   response,
          //   statusMessage2
          // });

          reject(error);

          // await this.goto(href, options);
          return;
        }

        await this.waitForAllContentLoaded();
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  @needsInit()
  async reload() {
    this.isPageReady = false;
    await safePromise(this._hero.reload());
    await this.waitForAllContentLoaded();
  }

  async queryElement(
    selector: string,
    options?: IWaitForElementOptions
  ): Promise<ISuperElement> {
    const element = await this.querySelector(selector);

    return safePromise<ISuperElement>(
      this.activeTab.waitForElement(element, options)
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
      waitExistsTimeout: 10000,
      timeout: 10000
    }
  ): Promise<T> {
    const element = await safePromise<ISuperElement>(
      this.hero.document
        .querySelector(selector)
        .$waitForExists({ timeoutMs: options.waitExistsTimeout }),
      {
        err: `Get Input Value error: "${selector}"`
      }
    );

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
  async saveProfileCookies() {
    const profile = await safePromise<IUserProfile>(
      this._hero.exportUserProfile()
    );

    if (!profile.cookies?.length) {
      return;
    }

    const cookies = profile.cookies.filter(
      (cookie) => cookie.name?.trim().length > 0
    );

    await safe(
      safeOverwriteFile(this.profilePath, TypeSerializer.stringify(cookies))
    );
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

    return safePromise(element.$isVisible);
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
    await safe<void>(this._hero.waitForLoad('AllContentLoaded'));
    await safe<void>(this._hero.waitForPaintingStable());

    await safe(this._hero.waitForMillis(5000)); // waits 5 seconds

    const currentUrl = await this._hero.url;

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
    await safe(this._hero.waitForLocation(trigger));
    await this.waitForAllContentLoaded();
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

  private async getProfileCookies(): Promise<ICookie[] | undefined> {
    const profileExists = existsSync(this.profilePath);

    if (!profileExists) {
      return undefined;
    }

    const content = await safePromise<string>(() =>
      readFileSync(this.profilePath, 'utf8')
    );

    if (content.length === 0) {
      return undefined;
    }

    const cookies = await safePromise<ICookie[]>(() =>
      TypeSerializer.parse(content)
    );

    return cookies.filter((cookie) => {
      return cookie.name?.trim().length > 0;
    });
  }
}
