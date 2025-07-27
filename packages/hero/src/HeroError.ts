import { STATUS_CODES } from "node:http";
import { Schema } from "effect";

const httpStatusCodes = new Map(Object.entries(STATUS_CODES));

export class HeroError extends Schema.TaggedError<HeroError>(
	"@scraper/app/HeroError",
)("HeroError", {
	module: Schema.String,
	method: Schema.String,
	name: Schema.optional(Schema.String),
	message: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	cause: Schema.optional(Schema.Defect),
}) {}

export class HeroHttpError extends Schema.TaggedError<HeroHttpError>(
	"@scraper/app/HeroHttpError",
)("HeroHttpError", {
	status: Schema.Number,
	isCloudflare: Schema.Boolean,
	retryAfter: Schema.optional(Schema.String),
}) {
	override get message(): string {
		// show error message
		// get status code message from httpStatusCodes
		const message = httpStatusCodes.get(this.status.toString());

		if (this.status === 403 && this.isCloudflare) {
			// show message about cloudflare challenge
			return "Cloudflare challenge detected. Please try again later.";
		}

		return `HTTP ${this.status} ${message ?? ""}. Retry after ${this.retryAfter ?? "unknown"}.`.trim();
	}
}

export class HeroHttpNetworcFailure extends Schema.TaggedError<HeroHttpNetworcFailure>(
	"@scraper/app/HeroHttpNetworcFailure",
)("HeroHttpNetworcFailure", {
	name: Schema.String,
	message: Schema.String,
	cause: Schema.Defect,
}) {}
