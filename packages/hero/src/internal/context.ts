import type { IHeroCreateOptions } from "@ulixee/hero";
import { Context } from "effect";

/** @internal */
export const HeroConfig = Context.GenericTag<IHeroCreateOptions>(
	"@scraper/HeroConfig",
);
