import type {
	HttpBody as Body,
	FileSystem,
	Headers,
	UrlParams,
} from "@effect/platform";
import type * as PlatformError from "@effect/platform/Error";
import type {
	HttpClientRequest as BaseHttpClientRequest,
	Options as HttpClientRequestOption,
} from "@effect/platform/HttpClientRequest";
import type { HttpMethod } from "@effect/platform/HttpMethod";
import type { Effect, Option, Schema, Stream } from "effect";
import type { Redacted } from "effect/Redacted";
import type { ParseOptions } from "effect/SchemaAST";
import * as internal from "./internal/httpBunClientRequest.ts";

export const BunTypeId: unique symbol = Symbol.for(
	"@effect/platform/BunHttpClientRequest",
);

export type BunTypeId = typeof BunTypeId;

export type BunOnlyFetchOptionsPure = Omit<
	BunFetchRequestInit,
	keyof RequestInit
>;

type BunOnlyFetchOptionsReadonly = Readonly<BunOnlyFetchOptionsPure>;

export interface BunHttpClientRequest
	extends BaseHttpClientRequest,
		BunOnlyFetchOptionsReadonly {
	readonly [BunTypeId]: BunTypeId;
}

export interface BunOptions
	extends HttpClientRequestOption,
		BunOnlyFetchOptionsReadonly {}

export interface BunOptionsNoBody
	extends Omit<BunOptions, "method" | "url" | "body"> {}

export interface BunOptionsNoUrl extends Omit<BunOptions, "method" | "url"> {}

export const make: <M extends HttpMethod>(
	method: M,
) => (
	url: string | URL,
	options?:
		| (M extends "GET" | "HEAD" ? BunOptionsNoBody : BunOptionsNoUrl)
		| undefined,
) => BunHttpClientRequest = internal.make;

export const get: (
	url: string | URL,
	options?: BunOptionsNoBody,
) => BunHttpClientRequest = internal.get;

export const post: (
	url: string | URL,
	options?: BunOptionsNoUrl,
) => BunHttpClientRequest = internal.post;

export const patch: (
	url: string | URL,
	options?: BunOptionsNoUrl,
) => BunHttpClientRequest = internal.patch;

export const put: (
	url: string | URL,
	options?: BunOptionsNoUrl,
) => BunHttpClientRequest = internal.put;

export const del: (
	url: string | URL,
	options?: BunOptionsNoUrl,
) => BunHttpClientRequest = internal.del;

export const head: (
	url: string | URL,
	options?: BunOptionsNoBody,
) => BunHttpClientRequest = internal.head;

export const options: (
	url: string | URL,
	options?: BunOptionsNoUrl,
) => BunHttpClientRequest = internal.options;

export const modify: {
	(options: BunOptions): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, options: BunOptions): BunHttpClientRequest;
} = internal.modify;

export const setMethod: {
	(method: HttpMethod): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, method: HttpMethod): BunHttpClientRequest;
} = internal.setMethod;

export const setVerbose: {
	(verbose: boolean): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, verbose: boolean): BunHttpClientRequest;
} = internal.setVerbose;

export const setProxy: {
	(proxy: string): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, proxy: string): BunHttpClientRequest;
} = internal.setProxy;

export const setTls: {
	(
		tls: BunFetchRequestInitTLS,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		tls: BunFetchRequestInitTLS,
	): BunHttpClientRequest;
} = internal.setTls;

export const setS3: {
	(s3: Bun.S3Options): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, s3: Bun.S3Options): BunHttpClientRequest;
} = internal.setS3;

export const setUnix: {
	(unix: string): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, unix: string): BunHttpClientRequest;
} = internal.setUnix;

export const setHeader: {
	(
		key: string,
		value: string,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		key: string,
		value: string,
	): BunHttpClientRequest;
} = internal.setHeader;

export const setHeaders: {
	(input: Headers.Input): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, input: Headers.Input): BunHttpClientRequest;
} = internal.setHeaders;

export const basicAuth: {
	(
		username: string | Redacted,
		password: string | Redacted,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		username: string | Redacted,
		password: string | Redacted,
	): BunHttpClientRequest;
} = internal.basicAuth;

export const bearerToken: {
	(
		token: string | Redacted,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, token: string | Redacted): BunHttpClientRequest;
} = internal.bearerToken;

export const accept: {
	(mediaType: string): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, mediaType: string): BunHttpClientRequest;
} = internal.accept;

export const acceptJson: (self: BunHttpClientRequest) => BunHttpClientRequest =
	internal.acceptJson;

export const setUrl: {
	(url: string | URL): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, url: string | URL): BunHttpClientRequest;
} = internal.setUrl;

export const prependUrl: {
	(path: string): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, path: string): BunHttpClientRequest;
} = internal.prependUrl;

export const appendUrl: {
	(path: string): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, path: string): BunHttpClientRequest;
} = internal.appendUrl;

export const updateUrl: {
	(
		f: (url: string) => string,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		f: (url: string) => string,
	): BunHttpClientRequest;
} = internal.updateUrl;

export const setUrlParam: {
	(
		key: string,
		value: string,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		key: string,
		value: string,
	): BunHttpClientRequest;
} = internal.setUrlParam;

export const setUrlParams: {
	(
		input: UrlParams.Input,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, input: UrlParams.Input): BunHttpClientRequest;
} = internal.setUrlParams;

export const appendUrlParam: {
	(
		key: string,
		value: string,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		key: string,
		value: string,
	): BunHttpClientRequest;
} = internal.appendUrlParam;

export const appendUrlParams: {
	(
		input: UrlParams.Input,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, input: UrlParams.Input): BunHttpClientRequest;
} = internal.appendUrlParams;

export const setHash: {
	(hash: string): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, hash: string): BunHttpClientRequest;
} = internal.setHash;

export const removeHash: (self: BunHttpClientRequest) => BunHttpClientRequest =
	internal.removeHash;

export const toUrl: (self: BunHttpClientRequest) => Option.Option<URL> =
	internal.toUrl;

export const setBody: {
	(body: Body.HttpBody): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, body: Body.HttpBody): BunHttpClientRequest;
} = internal.setBody;

export const bodyUint8Array: {
	(
		body: Uint8Array,
		contentType?: string,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		body: Uint8Array,
		contentType?: string,
	): BunHttpClientRequest;
} = internal.bodyUint8Array;

export const bodyText: {
	(
		body: string,
		contentType?: string,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		body: string,
		contentType?: string,
	): BunHttpClientRequest;
} = internal.bodyText;

export const bodyJson: {
	(
		body: unknown,
	): (
		self: BunHttpClientRequest,
	) => Effect.Effect<BunHttpClientRequest, Body.HttpBodyError>;
	(
		self: BunHttpClientRequest,
		body: unknown,
	): Effect.Effect<BunHttpClientRequest, Body.HttpBodyError>;
} = internal.bodyJson;

export const bodyUnsafeJson: {
	(body: unknown): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, body: unknown): BunHttpClientRequest;
} = internal.bodyUnsafeJson;

export const schemaBodyJson: <A, I, R>(
	schema: Schema.Schema<A, I, R>,
	options?: ParseOptions | undefined,
) => {
	(
		body: A,
	): (
		self: BunHttpClientRequest,
	) => Effect.Effect<BunHttpClientRequest, Body.HttpBodyError, R>;
	(
		self: BunHttpClientRequest,
		body: A,
	): Effect.Effect<BunHttpClientRequest, Body.HttpBodyError, R>;
} = internal.schemaBodyJson;

export const bodyUrlParams: {
	(
		input: UrlParams.Input,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, input: UrlParams.Input): BunHttpClientRequest;
} = internal.bodyUrlParams;

export const bodyFormData: {
	(body: FormData): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(self: BunHttpClientRequest, body: FormData): BunHttpClientRequest;
} = internal.bodyFormData;

export const bodyFormDataRecord: {
	(
		entries: Body.FormDataInput,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		entries: Body.FormDataInput,
	): BunHttpClientRequest;
} = internal.bodyFormDataRecord;

export const bodyStream: {
	(
		body: Stream.Stream<Uint8Array, unknown>,
		options?:
			| {
					readonly contentType?: string | undefined;
					readonly contentLength?: number | undefined;
			  }
			| undefined,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		body: Stream.Stream<Uint8Array, unknown>,
		options?:
			| {
					readonly contentType?: string | undefined;
					readonly contentLength?: number | undefined;
			  }
			| undefined,
	): BunHttpClientRequest;
} = internal.bodyStream;

export const bodyFile: {
	(
		path: string,
		options?: FileSystem.StreamOptions & { readonly contentType?: string },
	): (
		self: BunHttpClientRequest,
	) => Effect.Effect<
		BunHttpClientRequest,
		PlatformError.PlatformError,
		FileSystem.FileSystem
	>;
	(
		self: BunHttpClientRequest,
		path: string,
		options?: FileSystem.StreamOptions & { readonly contentType?: string },
	): Effect.Effect<
		BunHttpClientRequest,
		PlatformError.PlatformError,
		FileSystem.FileSystem
	>;
} = internal.bodyFile;

export const bodyFileWeb: {
	(
		file: Body.HttpBody.FileLike,
	): (self: BunHttpClientRequest) => BunHttpClientRequest;
	(
		self: BunHttpClientRequest,
		file: Body.HttpBody.FileLike,
	): BunHttpClientRequest;
} = internal.bodyFileWeb;
