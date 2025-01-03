import getPublicIP from '@scraper/ip-info';
import SuperDocument from '@ulixee/awaited-dom/impl/super-klasses/SuperDocument';
import { OpenDnsAlternate } from '@ulixee/default-browser-emulator/lib/utils/DnsOverTlsProviders';
import ExecuteJsPlugin from '@ulixee/execute-js-plugin';
import { type ISuperElement, KeyboardKey, type Tab } from '@ulixee/hero';
import CookieStorage from '@ulixee/hero/lib/CookieStorage';
import Hero from '@ulixee/hero/lib/Hero';
import type { ILoadStatus } from '@ulixee/unblocked-specification/agent/browser/Location';
import { clearTimeout } from 'node:timers';
import type { THeroOptions } from './App.ts';
import { needsFree, needsInit } from './classDecorators.ts';
import { useValidURL } from './utils/useValidURL.ts';

export type MaybeUndefinedPromise<T> = Promise<T | undefined>;
export type MaybeStringPromise = MaybeUndefinedPromise<string>;

export default abstract class HeroBase {
  protected isInitialised = false;
  protected isBusy = false;
  private _hero: Hero;
  protected sessionId: string;
  protected activeTab: Tab;
  protected document: SuperDocument;
  protected cookieStorage: CookieStorage;

  getIsInitialised() {
    return this.isInitialised;
  }

  get hero(): Hero {
    return this._hero;
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

    const locale = country
      ? new Intl.Locale(country, {
          region: country
        })
      : null;

    this._hero = new Hero({
      connectionToCore: {
        host: `ws://localhost:1818`
      },
      upstreamProxyUrl: proxy,
      upstreamProxyIpMask: {
        publicIp: ip,
        proxyIp: ip
      },
      dnsOverTlsProvider: OpenDnsAlternate,
      locale: locale?.toString(),
      geolocation: { latitude: ll?.at(0), longitude: ll?.at(1) },
      timezoneId: timezone,
      sessionKeepAlive: false,
      sessionPersistence: false,
      showChromeInteractions: false,
      mode: 'production',
      ...createOptions
    } as THeroOptions);

    this.isInitialised = true;

    this._hero.use(ExecuteJsPlugin);

    this.sessionId = await this._hero.sessionId;
    this.activeTab = this._hero.activeTab;
    this.document = this._hero.document;
    this.cookieStorage = this.activeTab.cookieStorage;
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
  protected async waitForNoElementWithText(
    selector: string,
    text: string,
    timeout?: number,
    exactMatch?: boolean,
    caseSensitive?: boolean,
    checksIntervalMs?: number
  ) {
    console.log(
      `Waiting for no '${selector}' element to exist with textContent '${text}'.`
    );

    return this.waitFor(
      async () =>
        !(await this.findElementWithText(
          selector,
          text,
          exactMatch,
          caseSensitive
        )),
      timeout,
      checksIntervalMs
    );
  }

  @needsInit()
  protected async waitForElementWithText(
    selector: string,
    text: string,
    timeout?: number,
    exactMatch?: boolean,
    caseSensitive?: boolean,
    checksIntervalMs?: number
  ) {
    console.log(
      `Waiting for '${selector}' element to exist with textContent '${text}'.`
    );

    return this.waitFor(
      () => this.findElementWithText(selector, text, exactMatch, caseSensitive),
      timeout,
      checksIntervalMs
    );
  }

  @needsInit()
  protected async findElementWithText(
    selector: string,
    text: string,
    exactMatch = true,
    caseSensitive = false
  ) {
    console.log(
      `Finding '${selector}' element with textContent ${
        exactMatch ? 'of' : 'containing'
      } '${text}'.`
    );
    const elements = this.document.querySelectorAll(selector);

    if (!caseSensitive) text = text.toLowerCase();

    for (const el of elements) {
      let elText = (await el.textContent) || '';
      if (!caseSensitive) elText = elText.toLowerCase();

      if (exactMatch && elText === text) return el;
      else if (elText.includes(text)) return el;
    }

    return null;
  }

  @needsInit()
  protected async waitForNoElement(
    selector: string,
    timeout?: number,
    checksIntervalMs?: number
  ) {
    console.log(`Waiting for no element to exist with selector '${selector}'.`);

    return this.waitFor(
      async () => !(await this.querySelector(selector, true)),
      timeout,
      checksIntervalMs
    );
  }

  @needsInit()
  protected async waitForLoad(status: ILoadStatus = 'AllContentLoaded') {
    await this._hero.waitForLoad(status);
  }

  @needsInit()
  protected async waitForElement(
    selector: string,
    timeout?: number,
    checksIntervalMs?: number
  ) {
    console.log(`Waiting for element with selector '${selector}' to exist.`);

    return this.waitFor(
      () => this.querySelector(selector),
      timeout,
      checksIntervalMs
    );
  }

  /**
   * Waits for a value to be truthy.
   *
   * NOTE: `this.document` and maybe other variables will not work inside a waitForValue call for some reason.
   *       If you need to access the document, do so via another function call.
   *
   * @param waitForValue THe value to wait for to be truthy
   * @param timeout The time in ms before timing out, throws after timeout
   * @param checksIntervalMs The time in ms between value checks
   * @returns The last value returned from waitForValue
   */
  @needsInit()
  protected async waitFor<T>(
    waitForValue: () => Promise<T>,
    timeout = 10e3,
    checksIntervalMs = 100
  ) {
    return new Promise<T>((resolve, reject) => {
      let timedOut = false;
      const id = timeout
        ? setTimeout(() => {
            timedOut = true;
          }, timeout)
        : null;

      (async () => {
        let value: T;
        while (!timedOut && !(value = await waitForValue())) {
          await this._hero.waitForMillis(checksIntervalMs);
        }
        if (timedOut) {
          reject();
          return;
        }

        if (id !== null) {
          clearTimeout(id);
        }
        // @ts-ignore
        resolve(value);
      })();
    });
  }

  @needsInit()
  protected async querySelector(
    selector: string,
    silent = false
  ): MaybeUndefinedPromise<ISuperElement> {
    if (!silent) console.log(`Selecting element '${selector}'.`);

    const element = this.document.querySelector(selector);
    if (!element) {
      if (!silent)
        console.log(`Could not find any element with selector '${selector}'.`);
      return undefined;
    }

    return element;
  }

  /**
   * Calls waitForNavigation if `hero.url` includes `match`.
   *
   * @param match The string to match for in the url
   * @param trigger The waitForLocation trigger
   * @param status The waitForLoad status to wait for from the page
   */
  @needsInit()
  protected async waitForNavigationConditional(
    match: string,
    trigger: 'change' | 'reload' = 'change',
    status?: ILoadStatus
  ) {
    if ((await this._hero.url).includes(match))
      await this.waitForNavigation(trigger, status);
  }

  /**
   * Calls hero's waitForLocation and then waitForLoad.
   *
   * @param trigger The waitForLocation trigger
   * @param status The waitForLoad status to wait for from the page
   */
  @needsInit()
  protected async waitForNavigation(
    trigger: 'change' | 'reload' = 'change',
    status?: ILoadStatus
  ) {
    await this._hero.waitForLocation(trigger);
    await this.waitForLoad(status);
  }

  @needsInit()
  async goto(
    href: string,
    skipIfAlreadyOnUrl = false,
    waitForStatus: ILoadStatus = 'AllContentLoaded'
  ) {
    const url = useValidURL(href);
    if (!url)
      throw new Error(`'goto' requires a valid URL, '${url}' is not valid.`);

    const currUrl = new URL(await this._hero.url);
    if (
      skipIfAlreadyOnUrl &&
      (currUrl.href === url.href ||
        (currUrl.href.endsWith('/') &&
          currUrl.href.substring(0, currUrl.href.length - 1) === url.href))
    )
      return;

    console.log(`Navigating to '${url.href}'.`);
    await this._hero.goto(url.href);
    await this._hero.waitForPaintingStable(); // waits for the page to load

    console.log('Navigated, waiting for page to load.');
    try {
      await this.waitForLoad(waitForStatus);
    } catch (error) {
      console.log(
        'Waiting for page load failed, waiting for additional 2 seconds and continuing.'
      );
      console.log('waitForLoad Error (can ignore):', error);
      await this._hero.waitForMillis(2e3);
    }
    console.log(`Opened '${url.href}'.`);
  }

  @needsInit()
  async reload() {
    await this._hero.reload();
    await this.waitForLoad();
  }
}
