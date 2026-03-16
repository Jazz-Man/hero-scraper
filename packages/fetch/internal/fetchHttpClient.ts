import { Headers, HttpClientError, HttpClientResponse } from "@effect/platform";

import { fetch as bunFetch } from "bun";
import { Effect, FiberRef, Stream } from "effect";
import type { BunHttpClient } from "../BunHttpClient.ts";

import { layerMergedContext, make } from "./httpBunClient.ts";

/** @internal */
export const fetchTagKey = "@effect-app/BunFetchHttpClient/BunFetch";
/** @internal */
export const requestInitTagKey =
	"@effect-app/BunFetchHttpClient/BunFetchOptions";

export const fetch: BunHttpClient = make((request, url, signal, fiber) => {
	const context = fiber.getFiberRef(FiberRef.currentContext);

	const options: BunFetchRequestInit =
		context.unsafeMap.get(requestInitTagKey) ?? {};

	const headers = options.headers
		? Headers.merge(
				Headers.fromInput(options.headers as Headers.Input),
				request.headers,
			)
		: request.headers;

	const send = (body: BodyInit | undefined) =>
		Effect.map(
			Effect.tryPromise({
				try: () =>
					bunFetch(url, {
						...options,
						method: request.method,
						headers,
						body,
						duplex: request.body._tag === "Stream" ? "half" : undefined,
						signal,
						tls: request.tls,
						verbose: request.verbose,
						proxy: request.proxy,
						s3: request.s3,
						unix: request.unix,
					} as BunFetchRequestInit),
				catch: (cause) =>
					new HttpClientError.RequestError({
						request,
						reason: "Transport",
						cause,
					}),
			}),
			(response) => HttpClientResponse.fromWeb(request, response),
		);
	switch (request.body._tag) {
		case "Raw":
		case "Uint8Array":
			return send(request.body.body as any);
		case "FormData":
			return send(request.body.formData);
		case "Stream":
			return Effect.flatMap(
				Stream.toReadableStreamEffect(request.body.stream),
				send,
			);
		default:
			return send(undefined);
	}
});

/** @internal */
export const layer = layerMergedContext(Effect.succeed(fetch));
