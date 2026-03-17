import { isIPv4 } from "node:net";
import { ParseResult, Schema } from "effect";

const ipField = Schema.String.pipe(
	Schema.filter(isIPv4, { message: () => "Invalid IPv4 address" }),
);

const IpFromString = Schema.transformOrFail(
	Schema.NonEmptyString,
	Schema.Trim,
	{
		strict: true,
		decode: (input, _, ast) => {
			if (isIPv4(input)) {
				return ParseResult.succeed(input);
			}

			const fail = ParseResult.fail(
				new ParseResult.Type(ast, input, "Failed to parse IP from string"),
			);

			const rawIp = input.split(" - ")?.at(0);

			if (!rawIp) {
				return fail;
			}

			if (!isIPv4(rawIp)) {
				return fail;
			}

			return ParseResult.succeed(rawIp);
		},

		encode: (input) => ParseResult.succeed(input.toString()),
	},
);

const IpInfoResponse = Schema.Struct({
	origin: Schema.optional(ipField),
	IP: Schema.optional(ipField),
	ip: Schema.optional(ipField),
	remote_addr: Schema.optional(ipField),
	raw: Schema.optional(IpFromString),
});

export const IpInfoResponseUnion = Schema.Union(IpInfoResponse, IpFromString);
