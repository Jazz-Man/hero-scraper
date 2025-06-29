Error.stackTraceLimit = Number.POSITIVE_INFINITY;

/**
 * @deprecated
 */
export type TSafeError = {
	success: false;
	error: Error;
};

/**
 * @deprecated
 */
export type Safe<T> =
	| {
			success: true;
			data: T;
	  }
	| TSafeError;

/**
 * @deprecated
 */
export type TSafeOptions = {
	logError?: boolean;
	err?: string;
	stack?: Error;
};

/**
 * @deprecated
 */
export type TSafePromiseOptions = TSafeOptions & {
	undefinedTest?: boolean;
	undefinedError?: string;
};

/**
 * @deprecated
 * @param error
 * @param options
 * @returns
 */
const getSafeError = (error: any, options?: TSafeOptions): TSafeError => {
	const message =
		options?.err !== undefined ? options.err : "Something went wrong";

	const e = error instanceof Error ? (error as Error) : new Error(message);

	options?.logError && console.error(e);

	return { success: false, error };
};

/**
 * @deprecated
 * @param result
 * @param resolve
 * @param reject
 * @param options
 * @returns
 */
function getSafePromiseResolve<T>(
	result: Safe<T>,
	resolve: (value: T | PromiseLike<T>) => void,
	reject: (error: Error) => void,
	options?: TSafePromiseOptions,
) {
	if (!result.success) {
		reject(result.error);
		return;
	}

	if (options?.undefinedTest && typeof result.data === "undefined") {
		const message =
			options?.undefinedError !== undefined
				? options.undefinedError
				: options?.err !== undefined
					? options.err
					: "result is undefined";

		const error = new Error(message);

		if (options.stack) {
			error.stack = options.stack.stack;
		}

		options?.logError && console.error(error);

		reject(error);
		return;
	}

	resolve(result.data);
}

/**
 * @deprecated
 * @param promise
 * @param options
 */
export function safe<T>(
	promise: Promise<T>,
	options?: TSafeOptions,
): Promise<Safe<T>>;
export function safe<T>(func: () => T, options?: TSafeOptions): Safe<T>;

/**
 * @deprecated
 * @param promiseOrFunc
 * @param options
 * @returns
 */
export function safe<T>(
	promiseOrFunc: Promise<T> | (() => T),
	options?: TSafeOptions,
): Promise<Safe<T>> | Safe<T> {
	const stack = new Error("stack");

	const config: TSafeOptions = {
		logError: true,
		stack,
		...options,
	};

	if (promiseOrFunc instanceof Promise) {
		return safeAsync(promiseOrFunc, config);
	}
	return safeSync(promiseOrFunc, config);
}

/**
 * @deprecated
 * @param promiseOrFunc
 * @param options
 * @returns
 */
export function safePromise<T>(
	promiseOrFunc: Promise<T> | (() => T),
	options?: TSafePromiseOptions,
): Promise<T> | T {
	const stack = new Error("stack");

	const config: TSafePromiseOptions = {
		stack,
		undefinedTest: true,
		logError: true,
		...options,
	};
	if (promiseOrFunc instanceof Promise) {
		return safeAsyncPromise<T>(promiseOrFunc, config);
	}
	return safeSyncPromise<T>(promiseOrFunc, config);
}

/**
 * @deprecated
 * @param promise
 * @param options
 * @returns
 */
async function safeAsync<T>(
	promise: Promise<T>,
	options?: TSafeOptions,
): Promise<Safe<T>> {
	try {
		const data = await promise;
		return { data, success: true };
	} catch (e) {
		return getSafeError(e, options);
	}
}

/**
 * @deprecated
 * @param func
 * @param options
 * @returns
 */
function safeSync<T>(func: () => T, options?: TSafeOptions): Safe<T> {
	try {
		const data = func();
		return { data, success: true };
	} catch (e) {
		return getSafeError(e, options);
	}
}

/**
 * @deprecated
 * @param promise
 * @param options
 * @returns
 */
function safeAsyncPromise<T>(
	promise: Promise<T>,
	options?: TSafePromiseOptions,
): Promise<T> {
	// biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
	return new Promise<T>(async (resolve, reject) => {
		const res = await safeAsync<T>(promise, {
			logError: options?.logError,
			err: options?.err,
			stack: options?.stack,
		});

		getSafePromiseResolve(res, resolve, reject, options);
	});
}

/**
 * @deprecated
 * @param func
 * @param options
 * @returns
 */
function safeSyncPromise<T>(
	func: () => T,
	options?: TSafePromiseOptions,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const result = safeSync<T>(func, {
			logError: options?.logError,
			err: options?.err,
			stack: options?.stack,
		});

		getSafePromiseResolve(result, resolve, reject, options);
	});
}
