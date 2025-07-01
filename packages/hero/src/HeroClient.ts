import type { HttpClientError, HttpClientRequest } from "@effect/platform";
import { Context, type Stream } from "effect";

export class HeroClient extends Context.Tag("@scraper/hero/HeroClient")<
	HeroClient,
	HeroClient.Service
>() {}

export declare namespace HeroClient {
	/**
	 * @since 1.0.0
	 * @category Models
	 */
	export interface Service {
		readonly client: Generated.Client;
		readonly streamRequest: <A>(
			request: HttpClientRequest.HttpClientRequest,
		) => Stream.Stream<A, HttpClientError.HttpClientError>;
		readonly stream: (
			request: StreamCompletionRequest,
		) => Stream.Stream<AiResponse.AiResponse, HttpClientError.HttpClientError>;
	}
}
