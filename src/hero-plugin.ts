import {CorePlugin} from '@ulixee/hero-plugin-utils';
import type IEmulationProfile from "@ulixee/unblocked-specification/plugin/IEmulationProfile";
import {type IPage} from "@ulixee/unblocked-specification/agent/browser/IPage";
import type ICorePluginCreateOptions from "@ulixee/hero-interfaces/ICorePluginCreateOptions";
import type {IEmulatorOptions} from "@ulixee/default-browser-emulator";


export class CoreHelloPlugin extends CorePlugin {
    static readonly id = 'hello-plugin';
    private emulationProfile: IEmulationProfile<IEmulatorOptions>;

    configure(emulationProfile: IEmulationProfile<any>): void | Promise<void> {
        this.emulationProfile = emulationProfile;

        this.logger.info(`Configure TEST "${this.id}"`,this.emulationProfile);
    }

    // constructor({ emulationProfile, corePlugins, logger, sessionSummary }: ICorePluginCreateOptions) {
    //     super({ emulationProfile, corePlugins, logger, sessionSummary });
    //
    //     this.emulationProfile = emulationProfile;
    //
    //     this.logger.info('New Page TEST',this.emulationProfile);
    // }

    // public onNewPage(page: IPage) {
    //
    //     const emulationProfile = this.emulationProfile;
    //
    //     this.logger.info('New Page TEST',page);
    // }
}