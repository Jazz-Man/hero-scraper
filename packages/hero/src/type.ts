import type Hero from "@ulixee/hero/lib/Hero";
import type { ICookie } from "@ulixee/unblocked-specification/agent/net/ICookie";
import type { Effect } from "effect";
import type { HeroError } from "./HeroError";

export type UnwrapPromise<T> = T extends Promise<infer U>
	? U
	: T extends (...args: any) => Promise<infer U>
		? U
		: T extends (...args: any) => infer U
			? U
			: T;

export type TInputValue = string | number;

export interface IInitProfileCookies extends Omit<ICookie, "expires"> {
	expires?: Date | null;
}

export type TProfileCookiesSet = Omit<IInitProfileCookies, "name" | "value">;

export type HeroClassProperties<Class> = {
	[Prop in keyof Class as Prop extends symbol
		? never
		: Prop]: Class[Prop] extends (...args: any[]) => any
		? (
				...args: Parameters<Class[Prop]>
			) => Effect.Effect<UnwrapPromise<ReturnType<Class[Prop]>>, HeroError>
		: Effect.Effect<UnwrapPromise<Class[Prop]>, HeroError>;
};

export type HeroProps = HeroClassProperties<Hero>;

export type CookieStorageProps = HeroClassProperties<
	typeof Hero.prototype.activeTab.cookieStorage
>;

export type AllHeroPropsList = keyof HeroProps;

export type HeroParametersType<T extends AllHeroPropsList> = Pick<
	HeroProps,
	T
>[T];
