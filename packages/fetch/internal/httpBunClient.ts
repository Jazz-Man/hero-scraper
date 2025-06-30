import {
	Cookies,
	Headers,
	HttpClientError,
	HttpClientResponse,
	HttpIncomingMessage,
	HttpTraceContext,
	UrlParams,
} from "@effect/platform";
import {
	Cause,
	Context,
	Effect,
	Exit,
	FiberRef,
	Inspectable,
	Layer,
	Predicate,
	Ref,
	Schedule,
	Scope,
	Stream,
} from "effect";
import type * as Fiber from "effect/Fiber";
import { constFalse, dual } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import { pipeArguments } from "effect/Pipeable";
import type { NoExcessProperties, NoInfer } from "effect/Types";

import type * as BunHttpClient from "../BunHttpClient.tsx";
import type * as BunHttpClientRequest from "../BunHttpClientRequest.tsx";
import * as internalRequest from "./httpBunClientRequest.ts";

/** @internal */
export const TypeId: BunHttpClient.TypeId = Symbol.for(
	"@effect/platform/BunHttpClient",
) as BunHttpClient.TypeId;

/** @internal */
export const tag = Context.GenericTag<BunHttpClient.BunHttpClient>(
	"@effect/platform/BunHttpClient",
);

/** @internal */
export const currentTracerDisabledWhen = globalValue(
	Symbol.for("@effect/platform/BunHttpClient/tracerDisabledWhen"),
	() =>
		FiberRef.unsafeMake<
			Predicate.Predicate<BunHttpClientRequest.BunHttpClientRequest>
		>(constFalse),
);

/** @internal */
export const withTracerDisabledWhen = dual<
	(
		predicate: Predicate.Predicate<BunHttpClientRequest.BunHttpClientRequest>,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		predicate: Predicate.Predicate<BunHttpClientRequest.BunHttpClientRequest>,
	) => BunHttpClient.BunHttpClientWith<E, R>
>(2, (self, pred) =>
	transformResponse(self, Effect.locally(currentTracerDisabledWhen, pred)),
);

/** @internal */
export const currentTracerPropagation = globalValue(
	Symbol.for("@effect/platform/BunHttpClient/currentTracerPropagation"),
	() => FiberRef.unsafeMake(true),
);

/** @internal */
export const withTracerPropagation = dual<
	(
		enabled: boolean,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		enabled: boolean,
	) => BunHttpClient.BunHttpClientWith<E, R>
>(2, (self, enabled) =>
	transformResponse(self, Effect.locally(currentTracerPropagation, enabled)),
);

/** @internal */
export const SpanNameGenerator =
	Context.Reference<BunHttpClient.SpanNameGenerator>()(
		"@effect/platform/BunHttpClient/SpanNameGenerator",
		{
			defaultValue:
				() => (request: BunHttpClientRequest.BunHttpClientRequest) =>
					`http.client ${request.method}`,
		},
	);

/** @internal */
export const withSpanNameGenerator = dual<
	(
		f: (request: BunHttpClientRequest.BunHttpClientRequest) => string,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (request: BunHttpClientRequest.BunHttpClientRequest) => string,
	) => BunHttpClient.BunHttpClientWith<E, R>
>(2, (self, f) =>
	transformResponse(self, Effect.provideService(SpanNameGenerator, f)),
);

const ClientProto = {
	[TypeId]: TypeId,
	pipe() {
		// biome-ignore lint/correctness/noUndeclaredVariables: <explanation>
		return pipeArguments(this, arguments);
	},
	...Inspectable.BaseProto,
	// biome-ignore lint/style/useNamingConvention: <explanation>
	toJSON() {
		return {
			_id: "@effect/platform/BunHttpClient",
		};
	},
	get(
		this: BunHttpClient.BunHttpClient,
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoBody,
	) {
		return this.execute(internalRequest.get(url, options));
	},
	head(
		this: BunHttpClient.BunHttpClient,
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoBody,
	) {
		return this.execute(internalRequest.head(url, options));
	},
	post(
		this: BunHttpClient.BunHttpClient,
		url: string | URL,
		options: BunHttpClientRequest.BunOptionsNoUrl,
	) {
		return this.execute(internalRequest.post(url, options));
	},
	put(
		this: BunHttpClient.BunHttpClient,
		url: string | URL,
		options: BunHttpClientRequest.BunOptionsNoUrl,
	) {
		return this.execute(internalRequest.put(url, options));
	},
	patch(
		this: BunHttpClient.BunHttpClient,
		url: string | URL,
		options: BunHttpClientRequest.BunOptionsNoUrl,
	) {
		return this.execute(internalRequest.patch(url, options));
	},
	del(
		this: BunHttpClient.BunHttpClient,
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoUrl,
	) {
		return this.execute(internalRequest.del(url, options));
	},
	options(
		this: BunHttpClient.BunHttpClient,
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoBody,
	) {
		return this.execute(internalRequest.options(url, options));
	},
};

const isClient = (
	u: unknown,
): u is BunHttpClient.BunHttpClientWith<unknown, unknown> =>
	Predicate.hasProperty(u, TypeId);

interface HttpClientImpl<E, R> extends BunHttpClient.BunHttpClientWith<E, R> {
	readonly preprocess: BunHttpClient.BunHttpClientPreprocess<E, R>;
	readonly postprocess: BunHttpClient.BunHttpClientPostprocess<E, R>;
}

/** @internal */
export const makeWith = <E2, R2, E, R>(
	postprocess: (
		request: Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
	preprocess: BunHttpClient.BunHttpClientPreprocess<E2, R2>,
): BunHttpClient.BunHttpClientWith<E, R> => {
	const self = Object.create(ClientProto);
	self.preprocess = preprocess;
	self.postprocess = postprocess;
	self.execute = (request: BunHttpClientRequest.BunHttpClientRequest) =>
		postprocess(preprocess(request));
	return self;
};

const responseRegistry = globalValue(
	"@effect/platform/BunHttpClient/responseRegistry",
	() => {
		if (
			"FinalizationRegistry" in globalThis &&
			globalThis.FinalizationRegistry
		) {
			const registry = new FinalizationRegistry(
				(controller: AbortController) => {
					controller.abort();
				},
			);
			return {
				register(
					response: HttpClientResponse.HttpClientResponse,
					controller: AbortController,
				) {
					registry.register(response, controller, response);
				},
				unregister(response: HttpClientResponse.HttpClientResponse) {
					registry.unregister(response);
				},
			};
		}

		const timers = new Map<HttpClientResponse.HttpClientResponse, any>();
		return {
			register(
				response: HttpClientResponse.HttpClientResponse,
				controller: AbortController,
			) {
				timers.set(
					response,
					setTimeout(() => controller.abort(), 5000),
				);
			},
			unregister(response: HttpClientResponse.HttpClientResponse) {
				const timer = timers.get(response);
				if (timer === undefined) {
					return;
				}
				clearTimeout(timer);
				timers.delete(response);
			},
		};
	},
);

const scopedRequests = globalValue(
	"@effect/platform/BunHttpClient/scopedRequests",
	() =>
		new WeakMap<BunHttpClientRequest.BunHttpClientRequest, AbortController>(),
);

/** @internal */
export const make = (
	f: (
		request: BunHttpClientRequest.BunHttpClientRequest,
		url: URL,
		signal: AbortSignal,
		fiber: Fiber.RuntimeFiber<
			HttpClientResponse.HttpClientResponse,
			HttpClientError.HttpClientError
		>,
	) => Effect.Effect<
		HttpClientResponse.HttpClientResponse,
		HttpClientError.HttpClientError
	>,
): BunHttpClient.BunHttpClient =>
	makeWith(
		(effect) =>
			Effect.flatMap(effect, (request) =>
				Effect.withFiberRuntime((fiber) => {
					const scopedController = scopedRequests.get(request);
					const controller = scopedController ?? new AbortController();
					const urlResult = UrlParams.makeUrl(
						request.url,
						request.urlParams,
						request.hash,
					);
					if (urlResult._tag === "Left") {
						return Effect.fail(
							new HttpClientError.RequestError({
								request,
								reason: "InvalidUrl",
								cause: urlResult.left,
							}),
						);
					}
					const url = urlResult.right;
					const tracerDisabled =
						!fiber.getFiberRef(FiberRef.currentTracerEnabled) ||
						fiber.getFiberRef(currentTracerDisabledWhen)(request);
					if (tracerDisabled) {
						const effect = f(request, url, controller.signal, fiber);
						if (scopedController) {
							return effect;
						}
						return Effect.uninterruptibleMask((restore) =>
							Effect.matchCauseEffect(restore(effect), {
								onSuccess(response) {
									responseRegistry.register(response, controller);
									return Effect.succeed(
										new InterruptibleResponse(response, controller),
									);
								},
								onFailure(cause) {
									if (Cause.isInterrupted(cause)) {
										controller.abort();
									}
									return Effect.failCause(cause);
								},
							}),
						);
					}
					const nameGenerator = Context.get(
						fiber.currentContext,
						SpanNameGenerator,
					);
					return Effect.useSpan(
						nameGenerator(request),
						{ kind: "client", captureStackTrace: false },
						(span) => {
							span.attribute("http.request.method", request.method);
							span.attribute("server.address", url.origin);
							if (url.port !== "") {
								span.attribute("server.port", +url.port);
							}
							span.attribute("url.full", url.toString());
							span.attribute("url.path", url.pathname);
							span.attribute("url.scheme", url.protocol.slice(0, -1));
							const query = url.search.slice(1);
							if (query !== "") {
								span.attribute("url.query", query);
							}
							const redactedHeaderNames = fiber.getFiberRef(
								Headers.currentRedactedNames,
							);
							const redactedHeaders = Headers.redact(
								request.headers,
								redactedHeaderNames,
							);
							for (const name in redactedHeaders) {
								span.attribute(
									`http.request.header.${name}`,
									String(redactedHeaders[name]),
								);
							}
							request = fiber.getFiberRef(currentTracerPropagation)
								? internalRequest.setHeaders(
										request,
										HttpTraceContext.toHeaders(span),
									)
								: request;
							return Effect.uninterruptibleMask((restore) =>
								restore(f(request, url, controller.signal, fiber)).pipe(
									Effect.withParentSpan(span),
									Effect.matchCauseEffect({
										onSuccess: (response) => {
											span.attribute(
												"http.response.status_code",
												response.status,
											);
											const redactedHeaders = Headers.redact(
												response.headers,
												redactedHeaderNames,
											);
											for (const name in redactedHeaders) {
												span.attribute(
													`http.response.header.${name}`,
													String(redactedHeaders[name]),
												);
											}
											if (scopedController) {
												return Effect.succeed(response);
											}
											responseRegistry.register(response, controller);
											return Effect.succeed(
												new InterruptibleResponse(response, controller),
											);
										},
										onFailure(cause) {
											if (!scopedController && Cause.isInterrupted(cause)) {
												controller.abort();
											}
											return Effect.failCause(cause);
										},
									}),
								),
							);
						},
					);
				}),
			),
		Effect.succeed as BunHttpClient.BunHttpClientPreprocess<never, never>,
	);

class InterruptibleResponse implements HttpClientResponse.HttpClientResponse {
	constructor(
		// biome-ignore lint/style/noParameterProperties: <explanation>
		readonly original: HttpClientResponse.HttpClientResponse,
		// biome-ignore lint/style/noParameterProperties: <explanation>
		readonly controller: AbortController,
	) {}

	readonly [HttpClientResponse.TypeId]: HttpClientResponse.TypeId =
		HttpClientResponse.TypeId;
	readonly [HttpIncomingMessage.TypeId]: HttpIncomingMessage.TypeId =
		HttpIncomingMessage.TypeId;

	private applyInterrupt<A, E, R>(effect: Effect.Effect<A, E, R>) {
		return Effect.suspend(() => {
			responseRegistry.unregister(this.original);
			return Effect.onInterrupt(effect, () =>
				Effect.sync(() => {
					this.controller.abort();
				}),
			);
		});
	}

	get request() {
		return this.original.request;
	}

	get status() {
		return this.original.status;
	}

	get headers() {
		return this.original.headers;
	}

	get cookies() {
		return this.original.cookies;
	}

	get remoteAddress() {
		return this.original.remoteAddress;
	}

	get formData() {
		return this.applyInterrupt(this.original.formData);
	}

	get text() {
		return this.applyInterrupt(this.original.text);
	}

	get json() {
		return this.applyInterrupt(this.original.json);
	}

	get urlParamsBody() {
		return this.applyInterrupt(this.original.urlParamsBody);
	}

	get arrayBuffer() {
		return this.applyInterrupt(this.original.arrayBuffer);
	}

	get stream() {
		return Stream.suspend(() => {
			responseRegistry.unregister(this.original);
			return Stream.ensuringWith(this.original.stream, (exit) => {
				if (Exit.isInterrupted(exit)) {
					this.controller.abort();
				}
				return Effect.void;
			});
		});
	}

	// biome-ignore lint/style/useNamingConvention: <explanation>
	toJSON() {
		return this.original.toJSON();
	}

	[Inspectable.NodeInspectSymbol]() {
		return this.original[Inspectable.NodeInspectSymbol]();
	}
}

/** @internal */
export const withScope = <E, R>(
	self: BunHttpClient.BunHttpClientWith<E, R>,
): BunHttpClient.BunHttpClientWith<E, R | Scope.Scope> =>
	transform(self, (effect, request) => {
		const controller = new AbortController();
		scopedRequests.set(request, controller);
		return Effect.zipRight(
			Effect.scopeWith((scope) =>
				Scope.addFinalizer(
					scope,
					Effect.sync(() => controller.abort()),
				),
			),
			effect,
		);
	});

export const {
	/** @internal */
	del,
	/** @internal */
	execute,
	/** @internal */
	get,
	/** @internal */
	head,
	/** @internal */
	options,
	/** @internal */
	patch,
	/** @internal */
	post,
	/** @internal */
	put,
} = Effect.serviceFunctions(tag);

/** @internal */
export const transform = dual<
	<E, R, E1, R1>(
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
			request: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	) => (
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E | E1, R | R1>,
	<E, R, E1, R1>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
			request: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	) => BunHttpClient.BunHttpClientWith<E | E1, R | R1>
>(2, (self, f) => {
	const client = self as HttpClientImpl<any, any>;
	return makeWith(
		Effect.flatMap((request) =>
			f(client.postprocess(Effect.succeed(request)), request),
		),
		client.preprocess,
	);
});

/** @internal */
export const filterStatus = dual<
	(
		f: (status: number) => boolean,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E | HttpClientError.ResponseError, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (status: number) => boolean,
	) => BunHttpClient.BunHttpClientWith<E | HttpClientError.ResponseError, R>
>(2, (self, f) =>
	transformResponse(self, Effect.flatMap(HttpClientResponse.filterStatus(f))),
);

/** @internal */
export const filterStatusOk = <E, R>(
	self: BunHttpClient.BunHttpClientWith<E, R>,
): BunHttpClient.BunHttpClientWith<E | HttpClientError.ResponseError, R> =>
	transformResponse(self, Effect.flatMap(HttpClientResponse.filterStatusOk));

/** @internal */
export const transformResponse = dual<
	<E, R, E1, R1>(
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	) => (
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E1, R1>,
	<E, R, E1, R1>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	) => BunHttpClient.BunHttpClientWith<E1, R1>
>(2, (self, f) => {
	const client = self as HttpClientImpl<any, any>;
	return makeWith(
		(request) => f(client.postprocess(request)),
		client.preprocess,
	);
});

/** @internal */
export const catchTag: {
	<K extends E extends { _tag: string } ? E["_tag"] : never, E, E1, R1>(
		tag: K,
		f: (
			e: Extract<E, { _tag: K }>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): <R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E1 | Exclude<E, { _tag: K }>, R1 | R>;
	<R, E, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		tag: K,
		f: (
			e: Extract<E, { _tag: K }>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): BunHttpClient.BunHttpClientWith<E1 | Exclude<E, { _tag: K }>, R1 | R>;
} = dual(
	3,
	<R, E, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		tag: K,
		f: (
			e: Extract<E, { _tag: K }>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): BunHttpClient.BunHttpClientWith<E1 | Exclude<E, { _tag: K }>, R1 | R> =>
		transformResponse(self, Effect.catchTag(tag, f)),
);

/** @internal */
export const catchTags: {
	<
		E,
		Cases extends {
			[K in Extract<E, { _tag: string }>["_tag"]]+?: (
				error: Extract<E, { _tag: K }>,
			) => Effect.Effect<HttpClientResponse.HttpClientResponse, any, any>;
		} & (unknown extends E
			? // biome-ignore lint/complexity/noBannedTypes: <explanation>
				{}
			: {
					[K in Exclude<
						keyof Cases,
						Extract<E, { _tag: string }>["_tag"]
					>]: never;
				}),
	>(
		cases: Cases,
	): <R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<
		| Exclude<E, { _tag: keyof Cases }>
		| {
				[K in keyof Cases]: Cases[K] extends (
					...args: any[]
				) => Effect.Effect<any, infer E, any>
					? E
					: never;
		  }[keyof Cases],
		| R
		| {
				[K in keyof Cases]: Cases[K] extends (
					...args: any[]
				) => Effect.Effect<any, any, infer R>
					? R
					: never;
		  }[keyof Cases]
	>;
	<
		E extends { _tag: string },
		R,
		Cases extends {
			[K in Extract<E, { _tag: string }>["_tag"]]+?: (
				error: Extract<E, { _tag: K }>,
			) => Effect.Effect<HttpClientResponse.HttpClientResponse, any, any>;
		} & (unknown extends E
			? // biome-ignore lint/complexity/noBannedTypes: <explanation>
				{}
			: {
					[K in Exclude<
						keyof Cases,
						Extract<E, { _tag: string }>["_tag"]
					>]: never;
				}),
	>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		cases: Cases,
	): BunHttpClient.BunHttpClientWith<
		| Exclude<E, { _tag: keyof Cases }>
		| {
				[K in keyof Cases]: Cases[K] extends (
					...args: any[]
				) => Effect.Effect<any, infer E, any>
					? E
					: never;
		  }[keyof Cases],
		| R
		| {
				[K in keyof Cases]: Cases[K] extends (
					...args: any[]
				) => Effect.Effect<any, any, infer R>
					? R
					: never;
		  }[keyof Cases]
	>;
} = dual(
	2,
	<
		E extends { _tag: string },
		R,
		Cases extends {
			[K in Extract<E, { _tag: string }>["_tag"]]+?: (
				error: Extract<E, { _tag: K }>,
			) => Effect.Effect<HttpClientResponse.HttpClientResponse, any, any>;
		} & (unknown extends E
			? // biome-ignore lint/complexity/noBannedTypes: <explanation>
				{}
			: {
					[K in Exclude<
						keyof Cases,
						Extract<E, { _tag: string }>["_tag"]
					>]: never;
				}),
	>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		cases: Cases,
	): BunHttpClient.BunHttpClientWith<
		| Exclude<E, { _tag: keyof Cases }>
		| {
				[K in keyof Cases]: Cases[K] extends (
					...args: any[]
				) => Effect.Effect<any, infer E, any>
					? E
					: never;
		  }[keyof Cases],
		| R
		| {
				[K in keyof Cases]: Cases[K] extends (
					...args: any[]
				) => Effect.Effect<any, any, infer R>
					? R
					: never;
		  }[keyof Cases]
	> => transformResponse(self, Effect.catchTags(cases) as any),
);

/** @internal */
export const catchAll: {
	<E, E2, R2>(
		f: (e: E) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): <R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E2, R | R2>;
	<E, R, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (e: E) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): BunHttpClient.BunHttpClientWith<E2, R | R2>;
} = dual(
	2,
	<E, R, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (e: E) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): BunHttpClient.BunHttpClientWith<E2, R | R2> =>
		transformResponse(self, Effect.catchAll(f)),
);

/** @internal */
export const filterOrElse: {
	<E2, R2>(
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orElse: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E2 | E, R2 | R>;
	<E, R, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orElse: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): BunHttpClient.BunHttpClientWith<E2 | E, R2 | R>;
} = dual(3, (self, f, orElse) =>
	transformResponse(self, Effect.filterOrElse(f, orElse)),
);

/** @internal */
export const filterOrFail: {
	<E2>(
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orFailWith: (response: HttpClientResponse.HttpClientResponse) => E2,
	): <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E2 | E, R>;
	<E, R, E2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orFailWith: (response: HttpClientResponse.HttpClientResponse) => E2,
	): BunHttpClient.BunHttpClientWith<E2 | E, R>;
} = dual(3, (self, f, orFailWith) =>
	transformResponse(self, Effect.filterOrFail(f, orFailWith)),
);

/** @internal */
export const mapRequest = dual<
	(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	) => BunHttpClient.BunHttpClientWith<E, R>
>(2, (self, f) => {
	const client = self as HttpClientImpl<any, any>;
	return makeWith(client.postprocess, (request) =>
		Effect.map(client.preprocess(request), f),
	);
});

/** @internal */
export const mapRequestEffect = dual<
	<E2, R2>(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>,
	<E, R, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>
>(2, (self, f) => {
	const client = self as HttpClientImpl<any, any>;
	return makeWith(client.postprocess as any, (request) =>
		Effect.flatMap(client.preprocess(request), f),
	);
});

/** @internal */
export const mapRequestInput = dual<
	(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	) => BunHttpClient.BunHttpClientWith<E, R>
>(2, (self, f) => {
	const client = self as HttpClientImpl<any, any>;
	return makeWith(client.postprocess, (request) =>
		client.preprocess(f(request)),
	);
});

/** @internal */
export const mapRequestInputEffect = dual<
	<E2, R2>(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>,
	<E, R, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>
>(2, (self, f) => {
	const client = self as HttpClientImpl<any, any>;
	return makeWith(client.postprocess as any, (request) =>
		Effect.flatMap(f(request), client.preprocess),
	);
});

/** @internal */
export const retry: {
	<E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
		options: O,
	): <R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientRetryReturn<R, E, O>;
	<B, E, R1>(
		policy: Schedule.Schedule<B, NoInfer<E>, R1>,
	): <R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R1 | R>;
	<E, R, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		options: O,
	): BunHttpClient.BunHttpClientRetryReturn<R, E, O>;
	<E, R, B, R1>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		policy: Schedule.Schedule<B, E, R1>,
	): BunHttpClient.BunHttpClientWith<E, R1 | R>;
} = dual(
	2,
	<E extends E0, E0, R, R1, B>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		policy: Schedule.Schedule<B, E0, R1>,
	): BunHttpClient.BunHttpClientWith<E, R | R1> =>
		transformResponse(self, Effect.retry(policy)),
);

/** @internal */
export const retryTransient: {
	<B, E, R1 = never>(
		options:
			| {
					readonly while?: Predicate.Predicate<NoInfer<E>>;
					readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>;
					readonly times?: number;
			  }
			| Schedule.Schedule<B, NoInfer<E>, R1>,
	): <R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R1 | R>;
	<E, R, B, R1 = never>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		options:
			| {
					readonly while?: Predicate.Predicate<NoInfer<E>>;
					readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>;
					readonly times?: number;
			  }
			| Schedule.Schedule<B, NoInfer<E>, R1>,
	): BunHttpClient.BunHttpClientWith<E, R1 | R>;
} = dual(
	2,
	<E extends E0, E0, R, B, R1 = never>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		options:
			| {
					readonly while?: Predicate.Predicate<NoInfer<E>>;
					readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>;
					readonly times?: number;
			  }
			| Schedule.Schedule<B, NoInfer<E>, R1>,
	): BunHttpClient.BunHttpClientWith<E, R | R1> =>
		transformResponse(
			self,
			Effect.retry({
				while:
					Schedule.ScheduleTypeId in options || options.while === undefined
						? isTransientError
						: Predicate.or(isTransientError, options.while),
				schedule:
					Schedule.ScheduleTypeId in options ? options : options.schedule,
				times: Schedule.ScheduleTypeId in options ? undefined : options.times,
			}),
		),
);

const isTransientError = (error: unknown) =>
	Predicate.hasProperty(error, Cause.TimeoutExceptionTypeId) ||
	isTransientHttpError(error);

const isTransientHttpError = (error: unknown) =>
	HttpClientError.isHttpClientError(error) &&
	((error._tag === "RequestError" && error.reason === "Transport") ||
		(error._tag === "ResponseError" && error.response.status >= 429));

/** @internal */
export const tap = dual<
	<_, E2, R2>(
		f: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<_, E2, R2>,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>,
	<E, R, _, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<_, E2, R2>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>
>(2, (self, f) => transformResponse(self, Effect.tap(f)));

/** @internal */
export const tapError = dual<
	<_, E, E2, R2>(
		f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>,
	) => <R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>,
	<E, R, _, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>
>(2, (self, f) => transformResponse(self, Effect.tapError(f)));

/** @internal */
export const tapRequest = dual<
	<_, E2, R2>(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<_, E2, R2>,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>,
	<E, R, _, E2, R2>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<_, E2, R2>,
	) => BunHttpClient.BunHttpClientWith<E | E2, R | R2>
>(2, (self, f) => {
	const client = self as HttpClientImpl<any, any>;
	return makeWith(client.postprocess as any, (request) =>
		Effect.tap(client.preprocess(request), f),
	);
});

/** @internal */
export const withCookiesRef = dual<
	(
		ref: Ref.Ref<Cookies.Cookies>,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		ref: Ref.Ref<Cookies.Cookies>,
	) => BunHttpClient.BunHttpClientWith<E, R>
>(
	2,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		ref: Ref.Ref<Cookies.Cookies>,
	): BunHttpClient.BunHttpClientWith<E, R> => {
		const client = self as HttpClientImpl<E, R>;
		return makeWith(
			(
				request: Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E, R>,
			) =>
				Effect.tap(client.postprocess(request), (response) =>
					Ref.update(ref, (cookies) =>
						Cookies.merge(cookies, response.cookies),
					),
				),
			(request) =>
				Effect.flatMap(client.preprocess(request), (request) =>
					Effect.map(Ref.get(ref), (cookies) =>
						Cookies.isEmpty(cookies)
							? request
							: internalRequest.setHeader(
									request,
									"cookie",
									Cookies.toCookieHeader(cookies),
								),
					),
				),
		);
	},
);

/** @internal */
export const followRedirects = dual<
	(
		maxRedirects?: number | undefined,
	) => <E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
	) => BunHttpClient.BunHttpClientWith<E, R>,
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		maxRedirects?: number | undefined,
	) => BunHttpClient.BunHttpClientWith<E, R>
>(
	(args) => isClient(args[0]),
	<E, R>(
		self: BunHttpClient.BunHttpClientWith<E, R>,
		maxRedirects?: number | undefined,
	): BunHttpClient.BunHttpClientWith<E, R> => {
		const client = self as HttpClientImpl<E, R>;
		return makeWith((request) => {
			const loop = (
				request: BunHttpClientRequest.BunHttpClientRequest,
				redirects: number,
			): Effect.Effect<HttpClientResponse.HttpClientResponse, E, R> =>
				Effect.flatMap(
					client.postprocess(Effect.succeed(request)),
					(response) =>
						response.status >= 300 &&
						response.status < 400 &&
						response.headers.location &&
						redirects < (maxRedirects ?? 10)
							? loop(
									internalRequest.setUrl(
										request,
										new URL(response.headers.location, response.request.url),
									),
									redirects + 1,
								)
							: Effect.succeed(response),
				);
			return Effect.flatMap(request, (request) => loop(request, 0));
		}, client.preprocess);
	},
);

/** @internal */
export const layerMergedContext = <E, R>(
	effect: Effect.Effect<BunHttpClient.BunHttpClient, E, R>,
): Layer.Layer<BunHttpClient.BunHttpClient, E, R> =>
	Layer.effect(
		tag,
		Effect.flatMap(Effect.context<never>(), (context) =>
			Effect.map(effect, (client) =>
				transformResponse(
					client,
					Effect.mapInputContext((input: Context.Context<never>) =>
						Context.merge(context, input),
					),
				),
			),
		),
	);
