import type { TUserCookies } from '@scraper/db';
import getPublicIP from '@scraper/ip-info';
import { safe } from '@scraper/safe';
import type SuperDocument from '@ulixee/awaited-dom/impl/super-klasses/SuperDocument';
import { OpenDnsAlternate } from '@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders';
import ExecuteJsPlugin from '@ulixee/execute-js-plugin';
import type { Tab } from '@ulixee/hero';
import type ISetCookieOptions from '@ulixee/hero-interfaces/ISetCookieOptions';
import type CookieStorage from '@ulixee/hero/lib/CookieStorage';
import Hero from '@ulixee/hero/lib/Hero';
import type IViewport from '@ulixee/unblocked-specification/agent/browser/IViewport';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import type IGeolocation from '@ulixee/unblocked-specification/plugin/IGeolocation';
import {
  type Fingerprint,
  FingerprintGenerator,
  type ScreenFingerprint
} from 'fingerprint-generator';
import type { THeroOptions } from '../@types';

export interface IInitProfileCookies extends Omit<ICookie, 'expires'> {
  expires?: Date | null;
}

export type TProfileCookiesSet = Omit<IInitProfileCookies, 'name' | 'value'>;

export default class HeroAppInstance {
  private activeTab: Tab;
  private document: SuperDocument;
  private cookieStorage: CookieStorage;
  private timezone: string | undefined;
  private readonly oneYearFromNow: Date;
  private baseUrl: URL;

  private readonly cookiesDomain: string;

  constructor(
    baseUrl: string,
    private createOptions?: THeroOptions,
    private profileCookies?: TUserCookies
  ) {
    try {
      this.baseUrl = new URL(baseUrl);

      const hostname = this.baseUrl.hostname;

      this.cookiesDomain = hostname.startsWith('www.')
        ? `.${hostname.replace(/^www\./, '')}`
        : hostname;
    } catch (e) {
      throw new Error(`Invalid URL: ${baseUrl}`);
    }

    this.oneYearFromNow = new Date();
    this.oneYearFromNow.setFullYear(this.oneYearFromNow.getFullYear() + 1);
  }

  private _hero: Hero;

  get hero(): Hero {
    return this._hero;
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

    this._hero.use(ExecuteJsPlugin);

    this.activeTab = this._hero.activeTab;
    this.document = this._hero.document;
    this.cookieStorage = this.activeTab.cookieStorage;

    return this._hero;
  }

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

  async getCookie(key: string): Promise<ICookie> {
    return await this.cookieStorage.getItem(key);
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

  async exportCookies() {
    const profile = await this._hero.exportUserProfile();

    return profile.cookies?.filter((cookie) => cookie.name?.length > 0);
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
