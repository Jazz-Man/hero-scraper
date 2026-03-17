import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

// ============================================================================
// Schemas using Schema.Class
// ============================================================================

export class User extends Schema.Class<User>("User")({
	username: Schema.String,
	password: Schema.String,
	hasAccount: Schema.Boolean,
	hasConfigured: Schema.Boolean,
	emailVerified: Schema.Boolean,
	tfaSecret: Schema.NullOr(Schema.String),
	email: Schema.NullOr(Schema.String),
}) {}

export class UserCookie extends Schema.Class<UserCookie>("UserCookie")({
	name: Schema.String,
	value: Schema.String,
	domain: Schema.String,
	path: Schema.String,
	expires: Schema.NullOr(Schema.DateTimeUtcFromString),
	httpOnly: Schema.Boolean,
	secure: Schema.Boolean,
	sameParty: Schema.Boolean,
	sameSite: Schema.Literals(["Strict", "Lax", "None"]),
}) {}

export class Zone extends Schema.Class<Zone>("Zone")({
	zoneId: Schema.String,
	domain: Schema.String,
}) {}

export class EmailRule extends Schema.Class<EmailRule>("EmailRule")({
	id: Schema.String,
	email: Schema.String,
	forwardTo: Schema.String,
	zoneId: Schema.String,
}) {}

// ============================================================================
// Repository Queries
// ============================================================================

/**
 * Get a user with their associated cookies
 */
export const getUserWithCookies = (username: string) =>
	Effect.gen(function* () {
		const sql = yield* SqlClient;

		const result = yield* sql`
			SELECT
				json_object(
					'username', u.username,
					'password', u.password,
					'has_account', u.has_account,
					'has_configured', u.has_configured,
					'email_verified', u.email_verified,
					'tfa_secret', u.tfa_secret,
					'email', u.email,
					'cookies', (
						SELECT json_group_array(json_object(
							'name', uc.name,
							'value', uc.value,
							'domain', uc.domain,
							'path', uc.path,
							'expires', uc.expires,
							'http_only', uc.http_only,
							'secure', uc.secure,
							'same_party', uc.same_party,
							'same_site', uc.same_site
						))
						FROM user_cookies uc
						WHERE uc.user_username = u.username
					)
				) as data
			FROM users u
			WHERE u.username = ${username}
		`.withoutTransform;

		if (!result || result.length === 0) {
			return null;
		}

		const userObj = JSON.parse(result[0]!.data as string);
		const cookies = userObj.cookies ? JSON.parse(userObj.cookies as string) : [];

		return { ...userObj, cookies } as User & { cookies: Array<UserCookie> };
	});

/**
 * Get list of users without accounts with their cookies
 */
export const getUserListWithCookies = (limit = 50) =>
	Effect.gen(function* () {
		const sql = yield* SqlClient;

		const result = yield* sql`
			SELECT
				json_object(
					'username', u.username,
					'password', u.password,
					'has_account', u.has_account,
					'has_configured', u.has_configured,
					'email_verified', u.email_verified,
					'tfa_secret', u.tfa_secret,
					'email', u.email,
					'cookies', (
						SELECT json_group_array(json_object(
							'name', uc.name,
							'value', uc.value,
							'domain', uc.domain,
							'path', uc.path,
							'expires', uc.expires,
							'http_only', uc.http_only,
							'secure', uc.secure,
							'same_party', uc.same_party,
							'same_site', uc.same_site
						))
						FROM user_cookies uc
						WHERE uc.user_username = u.username
					)
				) as data
			FROM users u
			WHERE u.has_account = 0
			LIMIT ${limit}
		`.withoutTransform;

		return result.map((row) => {
			const userObj = JSON.parse(row.data as string);
			const cookies = userObj.cookies ? JSON.parse(userObj.cookies as string) : [];

			return { ...userObj, cookies } as User & { cookies: Array<UserCookie> };
		});
	});

/**
 * Update user after signup with cookies (transactional)
 */
export const updateSignupUserCookies = (
	username: string,
	cookies: Array<UserCookie>,
) =>
	Effect.gen(function* () {
		const sql = yield* SqlClient;

		const transactionEffect = Effect.gen(function* () {
			yield* sql`UPDATE users SET has_account = 1 WHERE username = ${username}`;
			yield* sql`DELETE FROM user_cookies WHERE user_username = ${username}`;

			yield* Effect.forEach(cookies, (cookie) =>
				sql`
					INSERT INTO user_cookies (
						name, value, domain, path, expires,
						http_only, secure, same_party, same_site, user_username
					)
					VALUES (
						${cookie.name}, ${cookie.value}, ${cookie.domain}, ${cookie.path},
						${cookie.expires}, ${cookie.httpOnly}, ${cookie.secure},
						${cookie.sameParty}, ${cookie.sameSite}, ${username}
					)
				`,
			);
		});

		yield* sql.withTransaction(transactionEffect);
	});
