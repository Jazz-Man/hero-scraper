import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { makeRepository } from "effect/unstable/sql/SqlModel";
import * as SqlResolver from "effect/unstable/sql/SqlResolver";
import * as SqlSchema from "effect/unstable/sql/SqlSchema";
import { EmailRule, User, UserCookie, Zone } from "./schema.ts";

// ============================================================================
// Repository Layer - Auto-generated CRUD
// ============================================================================

export const makeZoneRepo = makeRepository(Zone, {
	tableName: "zones",
	spanPrefix: "Zone",
	idColumn: "zoneId",
});

export const makeEmailRuleRepo = makeRepository(EmailRule, {
	tableName: "email_rules",
	spanPrefix: "EmailRule",
	idColumn: "id",
});

export const makeUserRepo = makeRepository(User, {
	tableName: "users",
	spanPrefix: "User",
	idColumn: "username",
});

// Note: UserCookie has composite key (user_username, name, domain)
// For simple operations, we use userUsername as primary lookup
export const makeUserCookieRepo = makeRepository(UserCookie, {
	tableName: "user_cookies",
	spanPrefix: "UserCookie",
	idColumn: "userUsername",
});

// ============================================================================
// Resolvers - Batched operations with caching
// ============================================================================

/**
 * Resolver for batch-loading cookies by username
 * Uses SqlResolver.grouped for one-to-many relationship
 */
const makeCookiesByUserResolver = Effect.gen(function* () {
	const sql = yield* SqlClient;

	return SqlResolver.grouped({
		Request: Schema.String, // username
		RequestGroupKey: (request) => request,
		Result: UserCookie,
		ResultGroupKey: (cookie) => cookie.userUsername,
		execute: (usernames) =>
			sql`SELECT * FROM user_cookies WHERE user_username IN ${sql.in(usernames)}`,
	});
});

/**
 * Resolver for batch-deleting cookies by username
 */
const makeDeleteCookiesResolver = Effect.gen(function* () {
	const sql = yield* SqlClient;

	return SqlResolver.void({
		Request: Schema.String, // username
		execute: (usernames) =>
			sql`DELETE FROM user_cookies WHERE user_username IN ${sql.in(usernames)}`,
	});
});

/**
 * Resolver for batch-inserting cookies
 */
const makeInsertCookiesResolver = Effect.gen(function* () {
	const sql = yield* SqlClient;

	return SqlResolver.void({
		Request: UserCookie.insert,
		execute: (cookies) => sql`INSERT INTO user_cookies ${sql.insert(cookies)}`,
	});
});

// ============================================================================
// High-level API - Composed operations
// ============================================================================

/**
 * Get a user with their associated cookies
 * Uses batch-loading resolver for efficient cookie fetching
 */
export const getUserWithCookies = (username: string) =>
	Effect.gen(function* () {
		const userRepo = yield* makeUserRepo;
		const cookiesResolver = yield* makeCookiesByUserResolver;
		const getCookies = SqlResolver.request(cookiesResolver);

		// Fetch user
		const user = yield* userRepo.findById(username);

		// Batch-fetch cookies (will automatically batch if called multiple times)
		const cookies = yield* getCookies(username);

		return { ...user, cookies };
	});

/**
 * Get list of users without accounts with their cookies
 * Uses batch-loading for optimal performance
 */
export const getUserListWithCookies = (limit = 50) =>
	Effect.gen(function* () {
		const sql = yield* SqlClient;
		const cookiesResolver = yield* makeCookiesByUserResolver;
		const getCookies = SqlResolver.request(cookiesResolver);

		// Fetch users using SqlSchema
		const findUsers = SqlSchema.findAll({
			Request: Schema.Struct({ limit: Schema.Int }),
			Result: User,
			execute: ({ limit }) =>
				sql`SELECT * FROM users WHERE has_account = 0 LIMIT ${limit}`,
		});

		const users = yield* findUsers({ limit });

		// Batch-fetch all cookies in a single query
		const usernames = users.map((u) => u.username);
		const allCookies = yield* Effect.forEach(
			usernames,
			(username) => getCookies(username),
			{ concurrency: "unbounded" },
		);

		// Combine results
		return users.map((user, i) => ({
			...user,
			cookies: allCookies[i],
		}));
	});

/**
 * Update user after signup with cookies (transactional)
 * Uses repository + resolvers with transaction wrapping
 */
export const updateSignupUserCookies = (
	username: string,
	cookies: Array<UserCookie>,
) =>
	Effect.gen(function* () {
		const sql = yield* SqlClient;
		const deleteResolver = yield* makeDeleteCookiesResolver;
		const insertResolver = yield* makeInsertCookiesResolver;

		const deleteCookies = SqlResolver.request(deleteResolver);
		const insertCookie = SqlResolver.request(insertResolver);

		// Transactional update using sql.withTransaction
		yield* sql.withTransaction(
			Effect.gen(function* () {
				// Update user has_account flag - use manual SQL to only update needed field
				yield* sql`UPDATE users SET has_account = 1 WHERE username = ${username}`;

				// Delete existing cookies
				yield* deleteCookies(username);

				// Insert new cookies (will batch automatically)
				yield* Effect.forEach(cookies, (cookie) =>
					insertCookie({
						...cookie,
						userUsername: username,
					}),
				);
			}),
		);
	});
