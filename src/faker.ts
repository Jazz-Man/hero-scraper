import { base, en, en_US, Faker } from "@faker-js/faker";
import { Effect, Layer, Schema, ServiceMap } from "effect";

/**
 * @deprecated
 */
const faker = new Faker({ locale: [en_US, en, base] });

export default faker;

export class FakerError extends Schema.TaggedErrorClass<FakerError>()("FakerError", {
	message: Schema.Unknown,
}) {}

export class FakerService extends ServiceMap.Service<FakerService, {
	readonly faker: () => Faker;
}>()("FakerService") {
	static readonly layer = Layer.effect(FakerService, Effect.gen(function* () {
		const faker = () => new Faker({ locale: [en_US, en, base] });
		return FakerService.of({ faker });
	}));
}
