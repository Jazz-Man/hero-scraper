import { IpInfoService, PrivoxyService } from "@scraper/ip-info";
import { Console, Effect } from "effect";
import { HeroConfigService } from "../services/HeroConfigService";

const program = Effect.gen(function* () {
	const config = yield* HeroConfigService;

	const heroConfig = yield* config.getConfig();

	console.log(heroConfig);
}).pipe(Effect.catchAllCause((cause) => Console.log(cause)));

const runnable = program.pipe(
	Effect.provide(HeroConfigService.Default),
	Effect.provide(PrivoxyService.Default),
	Effect.provide(IpInfoService.Default),
);

Effect.runFork(runnable);
