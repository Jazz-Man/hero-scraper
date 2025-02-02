import SuperDocument from '@ulixee/awaited-dom/impl/super-klasses/SuperDocument';
import {
  FrameEnvironment,
  type ISuperElement,
  KeyboardKey,
  type Tab
} from '@ulixee/hero';
import Hero from '@ulixee/hero/lib/Hero';
import { type ILocationTrigger } from '@ulixee/unblocked-specification/agent/browser/Location';
import type { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';

import type IUserProfile from '@ulixee/hero-interfaces/IUserProfile';
import type IWaitForElementOptions from '@ulixee/hero-interfaces/IWaitForElementOptions';
import Resource from '@ulixee/hero/lib/Resource';
import { needsFree, needsInit, needsPageReady } from './classDecorators.ts';

import type { TUserCookies } from '@scraper/db';
import { safe, safePromise, type TSafePromiseOptions } from '@scraper/safe';
import type { IMousePositionXY } from '@ulixee/unblocked-specification/agent/interact/IInteractions';
import type { THeroOptions, TInputValue, TTGotoOptions } from './@types';
import HeroAppInstance from './hero';
import { useValidURL } from './utils/useValidURL.ts';

/**
 * @deprecated
 */
export default abstract class HeroBase {
  protected isInitialised = false;
  protected isBusy = false;
  protected activeTab: Tab;
  protected document: SuperDocument;

  private reinitCount = 0;
  private reinitMaxCount = 3;

  protected timeout = 30000;
  protected waitExistsTimeoutMs = this.timeout;
  private isPageReady = false;
  private createOption: THeroOptions | undefined;
  private initProfileCookies: TUserCookies | undefined;
  protected app: HeroAppInstance;

  protected constructor(protected baseUrl: string) {}

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
  async init(createOptions?: THeroOptions, profileCookies?: TUserCookies) {
    this.createOption = createOptions;
    this.initProfileCookies = profileCookies;

    this.app = new HeroAppInstance(
      this.baseUrl,
      this.createOption,
      profileCookies
    );

    this._hero = await this.app.getHero();

    this.isInitialised = true;
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

        await this.init(this.createOption, this.initProfileCookies);

        await this.goto(href, options);

        return;
      }

      throw e;
    }

    await this.waitForContentLoaded();
  }

  @needsInit()
  async reload() {
    this.isPageReady = false;
    await safePromise(
      this._hero.reload({
        timeoutMs: this.waitExistsTimeoutMs
      })
    );
    await this.waitForContentLoaded();
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

  async getProfileCookies(): Promise<ICookie[] | undefined> {
    const profile = await safePromise<IUserProfile>(
      this._hero.exportUserProfile()
    );

    if (!profile.cookies?.length) {
      return undefined;
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
  protected async handleTurnstileChallenge() {
    const frames = await safePromise<FrameEnvironment[]>(
      this.activeTab.frameEnvironments
    );

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

      const bodyRect = await body.getBoundingClientRect();

      const mousePosition: IMousePositionXY = [
        await bodyRect.x,
        await bodyRect.y
      ];

      await safe(
        this._hero.interact({
          scroll: mousePosition
        })
      );

      const checkbox = body.shadowRoot?.querySelector(
        'div.main-wrapper label.cb-lb'
      );

      if (await checkbox?.$isVisible) {
        await checkbox?.click();

        await this.hero.waitForMillis(1000);
      }
    }
  }

  @needsInit()
  private async waitForContentLoaded() {
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
    await this.waitForContentLoaded();
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
}
