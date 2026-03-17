import { Schema } from "effect";

// SameSite enum schema
export const SameSiteSchema = Schema.Literals(["Strict", "Lax", "None"]);
export type TSameSite = Schema.Schema.Type<typeof SameSiteSchema>;

// Zone schema
export const ZoneSchema = Schema.Struct({
	zoneId: Schema.String,
	domain: Schema.String,
});
export type TZone = Schema.Schema.Type<typeof ZoneSchema>;

// EmailRule schema
export const EmailRuleSchema = Schema.Struct({
	id: Schema.String,
	email: Schema.String,
	forwardTo: Schema.String,
	zoneId: Schema.String,
});
export type TEmailRule = Schema.Schema.Type<typeof EmailRuleSchema>;

// User schema
export const UserSchema = Schema.Struct({
	username: Schema.String,
	password: Schema.String,
	hasAccount: Schema.Boolean,
	hasConfigured: Schema.Boolean,
	emailVerified: Schema.Boolean,
	tfaSecret: Schema.NullOr(Schema.String),
	email: Schema.NullOr(Schema.String),
});
export type TUser = Schema.Schema.Type<typeof UserSchema>;

// UserCookie schema
export const UserCookieSchema = Schema.Struct({
	name: Schema.String,
	value: Schema.String,
	domain: Schema.String,
	path: Schema.String,
	expires: Schema.NullOr(Schema.DateTimeUtcFromString),
	httpOnly: Schema.Boolean,
	secure: Schema.Boolean,
	sameParty: Schema.Boolean,
	sameSite: SameSiteSchema,
});
export type TUserCookie = Schema.Schema.Type<typeof UserCookieSchema>;

// User cookies array type (for backward compatibility)
export type TUserCookies = ReadonlyArray<TUserCookie>;
