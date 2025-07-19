import { Data, Predicate, Schema } from "effect";

export const TypeId: unique symbol = Symbol.for("@scraper/app/HeroError");

export type TypeId = typeof TypeId;

export class HeroError extends Schema.TaggedError<HeroError>(
	"@scraper/app/HeroError",
)("HeroError", {
	module: Schema.String,
	method: Schema.String,
	description: Schema.optional(Schema.String),
	cause: Schema.optional(Schema.Defect),
}) {
	/**
	 * @since 1.0.0
	 */
	static is(u: unknown): u is HeroError {
		return Predicate.hasProperty(u, TypeId);
	}
	/**
	 * @since 1.0.0
	 */
	readonly [TypeId]: TypeId = TypeId;
}

export class HeroHttpError extends Data.TaggedError("HeroHttpError")<{
	status?: number;
	isCloudflare?: boolean;
}> {}

export class HeroHttpNetworcFailure extends Data.TaggedError(
	"HeroHttpNetworcFailure",
)<{
	name: string;
	message: string;
}> {}

export class HeroCloudFlareChallengeError extends Data.TaggedError(
	"HeroCloudFlareChallengeError",
)<{
	status: number;
	isCloudflare: boolean;
}> {}
