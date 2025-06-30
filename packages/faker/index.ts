import { base, en, en_US, Faker } from "@faker-js/faker";
import { Data, Effect } from "effect";

/**
 * @deprecated
 */
const faker = new Faker({ locale: [en_US, en, base] });

export default faker;

export class FakerError extends Data.TaggedError("FakerError")<{
	message: unknown;
}> {}

export class FakerService extends Effect.Service<FakerService>()(
	"FakerService",
	{
		effect: Effect.gen(function* () {
			const faker = () =>
				Effect.try({
					try: () => new Faker({ locale: [en_US, en, base] }),
					catch: (message) => new FakerError({ message }),
				});

			return { faker } as const;
		}),
	},
) {}
