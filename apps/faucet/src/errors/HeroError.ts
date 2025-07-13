import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";

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

	get message(): string {
		return `${this.module}.${this.method}: ${this.description}`;
	}
}
