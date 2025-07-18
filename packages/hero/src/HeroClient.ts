import { Effect } from "effect";
import { HeroAppService } from "./HeroAppService";

export class HeroClientService extends Effect.Service<HeroClientService>()(
	"HeroClientService",
	{
		effect: Effect.gen(function* (_) {
			const app = yield* _(HeroAppService);

			const hero = yield* _(
				app.getHero({
					showChrome: true,
					showDevtools: true,
				}),
			);

			const test = () => "";

			return { test } as const;
		}),
		dependencies: [HeroAppService.Default],
	},
) {}
