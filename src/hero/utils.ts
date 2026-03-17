import TimeoutError from "@ulixee/commons/interfaces/TimeoutError";
import { Effect } from "effect";
import type { LazyArg } from "effect/Function";
import { HeroError, HeroHttpNetworcFailure } from "./HeroError";
import type { AllHeroPropsList } from "./type";

export const _prepareError = (
	fn: Function,
	cause: unknown,
	method?: AllHeroPropsList | string,
) => {
	if (cause instanceof TimeoutError) {
		return cause;
	}

	const _method = method ? method : fn.toString();

	if (cause instanceof Error) {
		if (cause.message.includes("net::")) {
			return new HeroHttpNetworcFailure({
				name: cause.name,
				message: cause.message,
				cause,
			});
		}

		return new HeroError({
			module: "HeroAppService",
			method: _method,
			name: cause.name,
			message: cause.message,
			cause,
		});
	}

	return new HeroError({
		module: "HeroAppService",
		method: _method,
		cause,
	});
};

export const _tryMapPromise = <A, B, E1>(
	fn: (a: A, signal: AbortSignal) => PromiseLike<B>,
	method?: AllHeroPropsList | string,
) =>
	Effect.tryMapPromise({
		try: (a: A, signal) => fn(a, signal),
		catch: (cause) => _prepareError(fn, cause, method),
	});

export const _promise = <A>(
	fn: (signal: AbortSignal) => PromiseLike<A>,
	method?: AllHeroPropsList | string,
) =>
	Effect.tryPromise({
		try: (signal) => fn(signal),
		catch: (cause: unknown) => _prepareError(fn, cause, method),
	});

export const _try = <A>(fn: LazyArg<A>, method?: AllHeroPropsList | string) =>
	Effect.try({
		try: () => fn(),
		catch: (cause: unknown) => _prepareError(fn, cause, method),
	});
