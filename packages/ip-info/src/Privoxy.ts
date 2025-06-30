import crypto from "node:crypto";
import { Effect } from "effect";

export class PrivoxyService extends Effect.Service<PrivoxyService>()(
	"PrivoxyService",
	{
		effect: Effect.gen(function* () {
			const getRandomUsername = () => `x${crypto.randomUUID()}x`;

			const getProxyUrl = (username: string = getRandomUsername()) => {
				const proxy = new URL("http://127.0.0.1");

				proxy.port = "8118";
				proxy.password = "pass";
				proxy.username = username;

				return proxy.toString();
			};

			return { getRandomUsername, getProxyUrl } as const;
		}),
		accessors: true,
	},
) {}
