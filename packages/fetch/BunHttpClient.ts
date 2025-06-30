import type { HttpClientError, HttpClientResponse } from "@effect/platform";
import type { Cookies } from "@effect/platform/Cookies";
import { Context, type Effect, type FiberRef, type Predicate } from "effect";
import type { RuntimeFiber } from "effect/Fiber";

import type { Inspectable } from "effect/Inspectable";
import type { Layer } from "effect/Layer";

import type { Pipeable } from "effect/Pipeable";
import type { Ref } from "effect/Ref";
import type { Schedule } from "effect/Schedule";
import type { Scope } from "effect/Scope";

import type { NoExcessProperties } from "effect/Types";
import type * as BunHttpClientRequest from "./BunHttpClientRequest.ts";
import * as internal from "./internal/httpBunClient.ts";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId;

export type TypeId = typeof TypeId;

export interface BunHttpClient
	extends BunHttpClientWith<HttpClientError.HttpClientError> {}

export interface BunHttpClientWith<E, R = never> extends Pipeable, Inspectable {
	readonly [TypeId]: TypeId;
	readonly execute: (
		request: BunHttpClientRequest.BunHttpClientRequest,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;

	readonly get: (
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoBody,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;
	readonly head: (
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoBody,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;
	readonly post: (
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoUrl,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;
	readonly patch: (
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoUrl,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;
	readonly put: (
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoUrl,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;
	readonly del: (
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoUrl,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;
	readonly options: (
		url: string | URL,
		options?: BunHttpClientRequest.BunOptionsNoUrl,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;
}

export type BunHttpClientPreprocess<E, R> = (
	request: BunHttpClientRequest.BunHttpClientRequest,
) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E, R>;

export type BunHttpClientPostprocess<E = never, R = never> = (
	request: Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E, R>,
) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>;

export type BunHttpClientResponseType = Effect.Effect<
	HttpClientResponse.HttpClientResponse,
	HttpClientError.HttpClientError,
	BunHttpClient
>;

export const tag = Context.GenericTag<BunHttpClient>(
	"@effect/platform/BunHttpClient",
);

export const HttpClient: Context.Tag<BunHttpClient, BunHttpClient> = tag;

export const execute: (
	request: BunHttpClientRequest.BunHttpClientRequest,
) => BunHttpClientResponseType = internal.execute;

export const get: (
	url: string | URL,
	options?: BunHttpClientRequest.BunOptionsNoBody | undefined,
) => BunHttpClientResponseType = internal.get;

export const head: (
	url: string | URL,
	options?: BunHttpClientRequest.BunOptionsNoBody | undefined,
) => BunHttpClientResponseType = internal.head;

export const post: (
	url: string | URL,
	options?: BunHttpClientRequest.BunOptionsNoUrl | undefined,
) => BunHttpClientResponseType = internal.post;

export const patch: (
	url: string | URL,
	options?: BunHttpClientRequest.BunOptionsNoUrl | undefined,
) => BunHttpClientResponseType = internal.patch;

export const put: (
	url: string | URL,
	options?: BunHttpClientRequest.BunOptionsNoUrl | undefined,
) => BunHttpClientResponseType = internal.put;

export const del: (
	url: string | URL,
	options?: BunHttpClientRequest.BunOptionsNoUrl | undefined,
) => BunHttpClientResponseType = internal.del;

export const options: (
	url: string | URL,
	options?: BunHttpClientRequest.BunOptionsNoUrl | undefined,
) => BunHttpClientResponseType = internal.options;

export const catchAll: {
	<E, E2, R2>(
		f: (e: E) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): <R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E2, R2 | R>;
	<E, R, A2, E2, R2>(
		self: BunHttpClientWith<E, R>,
		f: (e: E) => Effect.Effect<A2, E2, R2>,
	): BunHttpClientWith<E2, R | R2>;
} = internal.catchAll;

export const catchTag: {
	<K extends E extends { _tag: string } ? E["_tag"] : never, E, E1, R1>(
		tag: K,
		f: (
			e: Extract<E, { _tag: K }>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): <R>(
		self: BunHttpClientWith<E, R>,
	) => BunHttpClientWith<E1 | Exclude<E, { _tag: K }>, R1 | R>;
	<R, E, K extends E extends { _tag: string } ? E["_tag"] : never, R1, E1>(
		self: BunHttpClientWith<E, R>,
		tag: K,
		f: (
			e: Extract<E, { _tag: K }>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): BunHttpClientWith<E1 | Exclude<E, { _tag: K }>, R1 | R>;
} = internal.catchTag;

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
	): <R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<
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
		self: BunHttpClientWith<E, R>,
		cases: Cases,
	): BunHttpClientWith<
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
} = internal.catchTags;

export const filterOrElse: {
	<E2, R2>(
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orElse: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E2 | E, R2 | R>;
	<E, R, E2, R2>(
		self: BunHttpClientWith<E, R>,
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orElse: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>,
	): BunHttpClientWith<E2 | E, R2 | R>;
} = internal.filterOrElse;

export const filterOrFail: {
	<E2>(
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orFailWith: (response: HttpClientResponse.HttpClientResponse) => E2,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E2 | E, R>;
	<E, R, E2>(
		self: BunHttpClientWith<E, R>,
		predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>,
		orFailWith: (response: HttpClientResponse.HttpClientResponse) => E2,
	): BunHttpClientWith<E2 | E, R>;
} = internal.filterOrFail;

export const filterStatus: {
	(
		f: (status: number) => boolean,
	): <E, R>(
		self: BunHttpClientWith<E, R>,
	) => BunHttpClientWith<E | HttpClientError.ResponseError, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		f: (status: number) => boolean,
	): BunHttpClientWith<E | HttpClientError.ResponseError, R>;
} = internal.filterStatus;

export const filterStatusOk: <E, R>(
	self: BunHttpClientWith<E, R>,
) => BunHttpClientWith<E | HttpClientError.ResponseError, R> =
	internal.filterStatusOk;

export const makeWith: <E2, R2, E, R>(
	postprocess: (
		request: Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
	preprocess: BunHttpClientPreprocess<E2, R2>,
) => BunHttpClientWith<E, R> = internal.makeWith;

export const make: (
	f: (
		request: BunHttpClientRequest.BunHttpClientRequest,
		url: URL,
		signal: AbortSignal,
		fiber: RuntimeFiber<
			HttpClientResponse.HttpClientResponse,
			HttpClientError.HttpClientError
		>,
	) => Effect.Effect<
		HttpClientResponse.HttpClientResponse,
		HttpClientError.HttpClientError
	>,
) => BunHttpClient = internal.make;

export const transform: {
	<E, R, E1, R1>(
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
			request: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): (self: BunHttpClientWith<E, R>) => BunHttpClientWith<E | E1, R | R1>;
	<E, R, E1, R1>(
		self: BunHttpClientWith<E, R>,
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
			request: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): BunHttpClientWith<E | E1, R | R1>;
} = internal.transform;

export const transformResponse: {
	<E, R, E1, R1>(
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): (self: BunHttpClientWith<E, R>) => BunHttpClientWith<E1, R1>;
	<E, R, E1, R1>(
		self: BunHttpClientWith<E, R>,
		f: (
			effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
		) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>,
	): BunHttpClientWith<E1, R1>;
} = internal.transformResponse;

export const mapRequest: {
	(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	): BunHttpClientWith<E, R>;
} = internal.mapRequest;

export const mapRequestEffect: {
	<E2, R2>(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E | E2, R | R2>;
	<E, R, E2, R2>(
		self: BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	): BunHttpClientWith<E | E2, R | R2>;
} = internal.mapRequestEffect;

export const mapRequestInput: {
	(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => BunHttpClientRequest.BunHttpClientRequest,
	): BunHttpClientWith<E, R>;
} = internal.mapRequestInput;

export const mapRequestInputEffect: {
	<E2, R2>(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E | E2, R | R2>;
	<E, R, E2, R2>(
		self: BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<BunHttpClientRequest.BunHttpClientRequest, E2, R2>,
	): BunHttpClientWith<E | E2, R | R2>;
} = internal.mapRequestInputEffect;

export type BunHttpClientRetryReturn<
	R,
	E,
	O extends NoExcessProperties<Effect.Retry.Options<E>, O>,
> = BunHttpClientWith<
	| (O extends { schedule: Schedule<infer _O, infer _I, infer _R> }
			? E
			: O extends { until: Predicate.Refinement<E, infer E2> }
				? E2
				: E)
	| (O extends {
			while: (...args: any[]) => Effect.Effect<infer _A, infer E, infer _R>;
	  }
			? E
			: never)
	| (O extends {
			until: (...args: any[]) => Effect.Effect<infer _A, infer E, infer _R>;
	  }
			? E
			: never),
	| R
	| (O extends { schedule: Schedule<infer _O, infer _I, infer R> } ? R : never)
	| (O extends {
			while: (...args: any[]) => Effect.Effect<infer _A, infer _E, infer R>;
	  }
			? R
			: never)
	| (O extends {
			until: (...args: any[]) => Effect.Effect<infer _A, infer _E, infer R>;
	  }
			? R
			: never)
> extends infer Z
	? Z
	: never;

export const retry: {
	<E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
		options: O,
	): <R>(self: BunHttpClientWith<E, R>) => BunHttpClientRetryReturn<R, E, O>;
	<B, E, R1>(
		policy: Schedule<B, NoInfer<E>, R1>,
	): <R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R1 | R>;
	<E, R, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(
		self: BunHttpClientWith<E, R>,
		options: O,
	): BunHttpClientRetryReturn<R, E, O>;
	<E, R, B, R1>(
		self: BunHttpClientWith<E, R>,
		policy: Schedule<B, E, R1>,
	): BunHttpClientWith<E, R1 | R>;
} = internal.retry;

export const retryTransient: {
	<B, E, R1 = never>(
		options:
			| {
					readonly while?: Predicate.Predicate<NoInfer<E>>;
					readonly schedule?: Schedule<B, NoInfer<E>, R1>;
					readonly times?: number;
			  }
			| Schedule<B, NoInfer<E>, R1>,
	): <R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R1 | R>;
	<E, R, B, R1 = never>(
		self: BunHttpClientWith<E, R>,
		options:
			| {
					readonly while?: Predicate.Predicate<NoInfer<E>>;
					readonly schedule?: Schedule<B, NoInfer<E>, R1>;
					readonly times?: number;
			  }
			| Schedule<B, NoInfer<E>, R1>,
	): BunHttpClientWith<E, R1 | R>;
} = internal.retryTransient;

export const tap: {
	<_, E2, R2>(
		f: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<_, E2, R2>,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E | E2, R | R2>;
	<E, R, _, E2, R2>(
		self: BunHttpClientWith<E, R>,
		f: (
			response: HttpClientResponse.HttpClientResponse,
		) => Effect.Effect<_, E2, R2>,
	): BunHttpClientWith<E | E2, R | R2>;
} = internal.tap;

export const tapError: {
	<_, E, E2, R2>(
		f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>,
	): <R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E | E2, R | R2>;
	<E, R, _, E2, R2>(
		self: BunHttpClientWith<E, R>,
		f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>,
	): BunHttpClientWith<E | E2, R | R2>;
} = internal.tapError;

export const tapRequest: {
	<_, E2, R2>(
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<_, E2, R2>,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E | E2, R | R2>;
	<E, R, _, E2, R2>(
		self: BunHttpClientWith<E, R>,
		f: (
			a: BunHttpClientRequest.BunHttpClientRequest,
		) => Effect.Effect<_, E2, R2>,
	): BunHttpClientWith<E | E2, R | R2>;
} = internal.tapRequest;

export const withCookiesRef: {
	(
		ref: Ref<Cookies>,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		ref: Ref<Cookies>,
	): BunHttpClientWith<E, R>;
} = internal.withCookiesRef;

export const followRedirects: {
	(
		maxRedirects?: number | undefined,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		maxRedirects?: number | undefined,
	): BunHttpClientWith<E, R>;
} = internal.followRedirects;

export const currentTracerDisabledWhen: FiberRef.FiberRef<
	Predicate.Predicate<BunHttpClientRequest.BunHttpClientRequest>
> = internal.currentTracerDisabledWhen;

export const withTracerDisabledWhen: {
	(
		predicate: Predicate.Predicate<BunHttpClientRequest.BunHttpClientRequest>,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		predicate: Predicate.Predicate<BunHttpClientRequest.BunHttpClientRequest>,
	): BunHttpClientWith<E, R>;
} = internal.withTracerDisabledWhen;

export const currentTracerPropagation: FiberRef.FiberRef<boolean> =
	internal.currentTracerPropagation;

export const withTracerPropagation: {
	(
		enabled: boolean,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		enabled: boolean,
	): BunHttpClientWith<E, R>;
} = internal.withTracerPropagation;

export const layerMergedContext: <E, R>(
	effect: Effect.Effect<BunHttpClient, E, R>,
) => Layer<BunHttpClient, E, R> = internal.layerMergedContext;

export interface SpanNameGenerator {
	readonly _: unique symbol;
}

export const SpanNameGenerator: Context.Reference<
	SpanNameGenerator,
	(request: BunHttpClientRequest.BunHttpClientRequest) => string
> = internal.SpanNameGenerator;

export const withSpanNameGenerator: {
	(
		f: (request: BunHttpClientRequest.BunHttpClientRequest) => string,
	): <E, R>(self: BunHttpClientWith<E, R>) => BunHttpClientWith<E, R>;
	<E, R>(
		self: BunHttpClientWith<E, R>,
		f: (request: BunHttpClientRequest.BunHttpClientRequest) => string,
	): BunHttpClientWith<E, R>;
} = internal.withSpanNameGenerator;

export const withScope: <E, R>(
	self: BunHttpClientWith<E, R>,
) => BunHttpClientWith<E, R | Scope> = internal.withScope;
