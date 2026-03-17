import { base, en, en_US, Faker } from "@faker-js/faker";
import { Effect, Layer, ServiceMap } from "effect";

export default class FakerService extends ServiceMap.Service<
	FakerService,
	{
		readonly faker: () => Faker;
	}
>()("FakerService") {
	static readonly layer = Layer.effect(
		FakerService,
		Effect.gen(function* () {
			return FakerService.of({
				faker: () => new Faker({ locale: [en_US, en, base] }),
			});
		}),
	);
}

/**
 * Convenience export for direct usage without Effect layer.
 * Backward compatible with `import faker from './faker.ts'`
 */
export const faker = new Faker({ locale: [en_US, en, base] });
