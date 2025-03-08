import {
  needsInit,
  needsLogin,
  needsPageReady,
  type IDecoratorBase
} from '@scraper/decorators';
import HeroApp, {
  type IMousePositionXY,
  type THero,
  type THeroOptions,
  type TTab
} from '@scraper/hero';
import {
  updateUserCookies,
  type TUserCookies,
  type TUsersWithCookies
} from '@scraper/prisma';

export interface IFaucet extends IDecoratorBase {
  get baseUrl(): string;

  getIsLoggedIn(): boolean;

  getIsFaucetReady(): boolean;

  app: HeroApp;

  initFaucet(): Promise<void>;
  login(): Promise<void>;
  configureAccount(): Promise<void>;

  getProfileCookies(): Promise<TUserCookies | undefined>;
}

export default abstract class FaucetBase implements IFaucet {
  protected isFaucetReady: boolean = false;
  protected isLoggedIn: boolean = false;
  private createOption: THeroOptions | undefined;
  private initProfileCookies: TUserCookies | undefined;
  protected activeTab: TTab;

  constructor(protected user: TUsersWithCookies) {}

  @needsLogin()
  configureAccount(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  @needsInit()
  @needsPageReady()
  login(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  get baseUrl(): string {
    throw new Error('Method not implemented.');
  }

  @needsInit()
  @needsPageReady()
  getIsLoggedIn() {
    return this.isLoggedIn;
  }

  getIsFaucetReady(): boolean {
    return this.isFaucetReady;
  }

  private _hero: THero;

  get hero(): THero {
    return this._hero;
  }

  private _app: HeroApp;

  get app(): HeroApp {
    return this._app;
  }

  initFaucet(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getProfileCookies(): Promise<TUserCookies | undefined> {
    return this.app.exportCookies();
  }

  async saveProfileCookies() {
    const profileCookies = await this.getProfileCookies();
    await updateUserCookies(this.user.username, profileCookies);
  }

  getIsPageReady(): boolean {
    return this.app.getIsPageReady();
  }

  getIsInitialised() {
    return this.app.getIsInitialised();
  }

  protected async init(
    createOptions?: THeroOptions,
    profileCookies?: TUserCookies
  ) {
    this.isFaucetReady = false;
    this.isLoggedIn = false;

    this.createOption = createOptions;
    this.initProfileCookies = profileCookies;

    this._app = new HeroApp({
      baseUrl: this.baseUrl,
      createOptions: this.createOption,
      profileCookies: this.initProfileCookies
    });

    this._hero = await this._app.getHero();
    this.activeTab = this._app.activeTab;

    this.isFaucetReady = true;
  }

  @needsInit()
  async handleTurnstileChallenge() {
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
      }
    }
  }
}
