import { isIPv4 } from "node:net";
import { Schema } from "effect";

const IpField = Schema.Trim.check(
	Schema.makeFilter((ipString) => isIPv4(ipString), {
		message: "Invalid IPv4 address",
	}),
);

export const IpInfoResponse = Schema.Struct({
	origin: Schema.optional(IpField),
	IP: Schema.optional(IpField),
	ip: Schema.optional(IpField),
	remote_addr: Schema.optional(IpField),
	raw: Schema.optional(IpField),
});

export const ipDecoder = Schema.decodeUnknownSync(IpInfoResponse);
