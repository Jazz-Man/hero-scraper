import type { fetch as bunFetch } from "bun";
import { Context, type Layer } from "effect";

import type { BunHttpClient } from "./BunHttpClient.ts";
import {
	fetchTagKey,
	layer as internalLayer,
	requestInitTagKey,
} from "./internal/fetchHttpClient.ts";

export class Fetch extends Context.Tag(fetchTagKey)<Fetch, typeof bunFetch>() {}

export class BunFetchRequestInit extends Context.Tag(requestInitTagKey)<
	BunFetchRequestInit,
	globalThis.BunFetchRequestInit
>() {}

export const layer: Layer.Layer<BunHttpClient> = internalLayer;
