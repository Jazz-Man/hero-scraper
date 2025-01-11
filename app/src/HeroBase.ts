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
import type IWaitForElementOptions from '@ulixee/hero-interfaces/IWaitForElementOptions';
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
import { useValidURL } from './utils/useValidURL.ts';

export type THeroOptions = IHeroCreateOptions;

export type MaybeUndefinedPromise<T> = Promise<T | undefined>;
export type MaybeStringPromise = MaybeUndefinedPromise<string>;

export type TSetCookieOptions = Omit<ICookie, 'name' | 'value' | 'expires'> & {
  expires?: Date | number;
};

export default abstract class HeroBase {
  protected isInitialised = false;
  protected isBusy = false;
  protected activeTab: Tab;
  protected document: SuperDocument;
  protected cookieStorage: CookieStorage;
  private isPageReady = false;

  private _hero: Hero;
  private readonly tmpDir: string;

  private readonly profilePath: string;
  protected profileCookies: ICookie[] | undefined;

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

  protected constructor() {
    this.tmpDir = Path.join(__dirname, '../../.tmp');

    this.profilePath = Path.join(this.tmpDir, 'profile-test.json');
  }

  @needsFree()
  // @makesBusy()
  async init(createOptions?: THeroOptions) {
    const { country, ll, ip, timezone, proxy } = await getPublicIP();

    const intLocale = country
      ? new Intl.Locale(country, {
          region: country
        })
      : null;

    const locale = intLocale?.toString();

    this.profileCookies = this.getProfileCookies();

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

    const { navigator, screen } = await this.getFingerprint(locale);

    const viewport = this.getViewport(screen);

    this._hero = new Hero({
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
    } as THeroOptions);

    this._hero.use(ExecuteJsPlugin);

    this.activeTab = this._hero.activeTab;
    this.document = this._hero.document;
    this.cookieStorage = this.activeTab.cookieStorage;

    this.isInitialised = true;
  }

  private async getFingerprint(locale?: string): Promise<Fingerprint> {
    return new Promise<Fingerprint>((resolve, reject) => {
      try {
        const locales: string[] = [];

        if (locale) {
          locales.push(locale);
        }

        const generator = new FingerprintGenerator({
          mockWebRTC: true,
          browsers: ['chrome'],
          operatingSystems: ['macos'],
          devices: ['desktop'],
          httpVersion: '2',
          locales
        });
        resolve(generator.getFingerprint().fingerprint);
      } catch (e) {
        reject(e);
      }
    });
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

    await this.cookieStorage.setItem(key, value, options as ISetCookieOptions);
  }

  @needsPageReady()
  @needsInit()
  async getCookie(key: string) {
    return await this.cookieStorage.getItem(key);
  }

  async getCookieValue(key: string): MaybeStringPromise {
    return await this.getCookie(key).then((res) => res?.value);
  }

  @needsInit()
  async goto(
    href: string,
    options?: {
      timeoutMs?: number;
      referrer?: string;
    }
  ) {
    this.isPageReady = false;
    await this._hero.goto(href, options);
    await this.waitForAllContentLoaded();
  }

  @needsInit()
  async reload() {
    this.isPageReady = false;
    await this._hero.reload();
    await this.waitForAllContentLoaded();
  }

  /**
   * Performs Ctrl+A, then Backspace.
   *
   * Make sure you have a focused element before calling this.
   */
  @needsInit()
  protected async clearInput() {
    // select all text in input
    await this._hero.interact(
      { keyDown: KeyboardKey.ControlLeft },
      { keyDown: KeyboardKey.A }
    );
    await this._hero.interact(
      { keyUp: KeyboardKey.A },
      { keyUp: KeyboardKey.ControlLeft }
    );

    // delete all text in input
    await this._hero.type(KeyboardKey.Backspace);
  }

  @needsInit()
  protected async waitForAllContentLoaded() {
    await this._hero.waitForLoad('AllContentLoaded');
    await this._hero.waitForPaintingStable();
    const currentUrl = await this._hero.url;

    this.isPageReady = useValidURL(currentUrl) instanceof URL;
  }

  @needsInit()
  @needsPageReady()
  protected async querySelector(selector: string): Promise<ISuperElement> {
    return new Promise((resolve, reject) => {
      const element = this.document.querySelector(selector);
      if (!element) {
        reject(`Element not found: "${selector}"`);
      }
      resolve(element);
    });
  }

  @needsInit()
  @needsPageReady()
  protected async waitForElement(
    element: ISuperElement,
    options?: IWaitForElementOptions
  ): Promise<ISuperElement> {
    return new Promise(async (resolve, reject) => {
      try {
        const el = await this.activeTab.waitForElement(element, options);
        resolve(el);
      } catch (e) {
        reject(e);
      }
    });
  }

  async queryElement(selector: string, options?: IWaitForElementOptions) {
    const element = await this.querySelector(selector);
    return await this.waitForElement(element, options);
  }

  async clickElement(
    selector: string,
    queryOptions?: IWaitForElementOptions
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        const element = await this.queryElement(selector, queryOptions);
        await this._hero.interact({
          click: { element, verification: 'exactElement' }
        });
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  async typeInput(
    selector: string,
    content: string,
    queryOptions?: IWaitForElementOptions
  ) {
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        const element = await this.queryElement(selector, queryOptions);
        await this._hero.interact({
          click: { element, verification: 'exactElement' },
          type: content
        });
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Calls hero's waitForLocation and then waitForLoad.
   *
   * @param trigger The waitForLocation trigger
   */
  @needsInit()
  protected async waitForNavigation(trigger: ILocationTrigger = 'change') {
    this.isPageReady = false;
    await this._hero.waitForLocation(trigger);
    await this.waitForAllContentLoaded();
  }

  private getProfileCookies(): ICookie[] | undefined {
    let cookies: ICookie[] | undefined = undefined;
    const profileExists = existsSync(this.profilePath);

    if (profileExists) {
      cookies = TypeSerializer.parse(readFileSync(this.profilePath, 'utf8'));
    }

    return cookies;
  }

  @needsInit()
  @needsPageReady()
  async saveProfileCookies() {
    const profile = await this._hero.exportUserProfile();
    await safeOverwriteFile(
      this.profilePath,
      TypeSerializer.stringify(profile.cookies)
    );
  }
}
