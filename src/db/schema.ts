import { Schema } from "effect";
import { Model } from "effect/unstable/schema";

// ============================================================================
// Reusable Schema Definitions
// ============================================================================

const SameSiteSchema = Schema.Literals(["Strict", "Lax", "None"]);

// ============================================================================
// Database Models using Model.Class
// This creates schemas with variants: select, insert, update, json
// ============================================================================

export class User extends Model.Class<User>("User")({
	username: Schema.String,
	password: Schema.String,
	hasAccount: Model.BooleanSqlite,
	hasConfigured: Model.BooleanSqlite,
	emailVerified: Model.BooleanSqlite,
	tfaSecret: Schema.NullOr(Schema.String),
	email: Schema.NullOr(Schema.String),
}) {}

export class UserCookie extends Model.Class<UserCookie>("UserCookie")({
	userUsername: Schema.String,
	name: Schema.String,
	value: Schema.String,
	domain: Schema.String,
	path: Schema.String,
	expires: Schema.NullOr(Schema.DateTimeUtcFromString),
	httpOnly: Model.BooleanSqlite,
	secure: Model.BooleanSqlite,
	sameParty: Model.BooleanSqlite,
	sameSite: Model.Field({
		select: SameSiteSchema,
		insert: SameSiteSchema,
		update: SameSiteSchema,
		json: SameSiteSchema,
	}),
}) {}

export class Zone extends Model.Class<Zone>("Zone")({
	zoneId: Schema.String,
	domain: Schema.String,
}) {}

export class EmailRule extends Model.Class<EmailRule>("EmailRule")({
	id: Schema.String,
	email: Schema.String,
	forwardTo: Schema.String,
	zoneId: Schema.String,
}) {}
