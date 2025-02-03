import Hero from '@ulixee/hero/lib/Hero';

import {
  type TUserCookies,
  type TUsersWithCookies,
  updateUserCookies
} from '@scraper/db';
import type { Tab } from '@ulixee/hero';
import type { THeroOptions } from './@types';
import HeroApp from './hero';
import {
  type IDecoratorBase,
  needsInit,
  needsLogin,
  needsPageReady
} from './utils/classDecorators.ts';

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
  protected activeTab: Tab;

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

  private _hero: Hero;

  get hero(): Hero {
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
}
