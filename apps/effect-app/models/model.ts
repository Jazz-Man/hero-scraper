import { Data } from "effect";

export class HeaderParseError extends Data.TaggedError("HeaderParseError") {}

export class UnknownError extends Data.TaggedError("UnknownError")<{
	readonly error: unknown;
}> {}

export class TextDecodeError extends Data.TaggedError("TextDecodeError") {}

export class JsonDecodeError extends Data.TaggedError("JsonDecodeError") {}

export type FetchError = UnknownError | TextDecodeError;
