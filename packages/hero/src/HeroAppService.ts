import type { HttpClient } from "@effect/platform/HttpClient";
import { Context, Effect } from "effect";
import { dual } from "effect/Function";

export class HeroConfig extends Context.Tag("@scraper/hero/HeroConfig")<
	HeroConfig,
	HeroConfig.Service
>() {
	static readonly getOrUndefined: Effect.Effect<
		typeof HeroConfig.Service | undefined
	> = Effect.map(Effect.context<never>(), (context) =>
		context.unsafeMap.get(HeroConfig.key),
	);
}

export declare namespace HeroConfig {
	export interface Service {
		readonly transformClient?: (client: HttpClient) => HttpClient;
	}
}

export const withClientTransform: {
	(
		transform: (client: HttpClient) => HttpClient,
	): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		transform: (client: HttpClient) => HttpClient,
	): Effect.Effect<A, E, R>;
} = dual<
	(
		transform: (client: HttpClient) => HttpClient,
	) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
	<A, E, R>(
		self: Effect.Effect<A, E, R>,
		transform: (client: HttpClient) => HttpClient,
	) => Effect.Effect<A, E, R>
>(2, (self, transformClient) =>
	Effect.flatMap(HeroConfig.getOrUndefined, (config) =>
		Effect.provideService(self, HeroConfig, { ...config, transformClient }),
	),
);
