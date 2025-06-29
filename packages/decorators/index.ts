/**
 * @deprecated
 * @param msg
 * @returns
 */
const sanitize = (msg: string) => msg.replace(/[^a-zA-Z0-9 ]/g, "");

/**
 * @deprecated
 * @param propertyGetter
 * @param errorMsg
 * @returns
 */
export function createFlagDecorator(propertyGetter: string, errorMsg: string) {
	return () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, key: string, descriptor: PropertyDescriptor) => {
			if (!Reflect.has(target, propertyGetter))
				throw new Error(
					`Target does not contain getter for '${sanitize(propertyGetter)}'.`,
				);

			const originalFunc = descriptor.value;

			descriptor.value = function (...args: unknown[]) {
				const propertyValue = Reflect.get(target, propertyGetter) as (
					...args: unknown[]
				) => boolean;

				if (propertyValue.apply(this)) {
					return originalFunc.apply(this, args);
				}

				throw new Error(sanitize(errorMsg).replace("$key", key));
			};
		};
	};
}

/**
 * @deprecated
 */
export const needsCsrfToken = createFlagDecorator(
	"hasCsrfToken",
	"Page must have a csrf token before using '$key'.",
);

/**
 * @deprecated
 */
export const needsPageReady = createFlagDecorator(
	"getIsPageReady",
	"Page mast be ready before using '$key'.",
);

/**
 * @deprecated
 */
export const needsInit = createFlagDecorator(
	"getIsInitialised",
	"You must initalize the client before using '$key'.",
);

/**
 * @deprecated
 */
export const needsLogin = createFlagDecorator(
	"getIsLoggedIn",
	"The client must be logged in before using '$key'.",
);

/**
 * @deprecated
 */
export const needsFaucet = createFlagDecorator(
	"getIsFaucetReady",
	"The faucet must be ready before using '$key'.",
);

/**
 * @deprecated
 */
export interface IDecoratorBase {
	getIsPageReady(): boolean;

	getIsInitialised(): boolean;
}

/**
 * @deprecated
 */
export class DecoratorBaseClass implements IDecoratorBase {
	protected isPageReady: boolean;
	protected isInitialised: boolean;

	getIsPageReady(): boolean {
		return this.isPageReady;
	}

	getIsInitialised(): boolean {
		return this.isInitialised;
	}
}
