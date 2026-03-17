import { SqlClient } from "effect/unstable/sql/SqlClient"
import { Effect } from "effect"

export default Effect.gen(function* () {
	const sql = yield* SqlClient

	// Create zones table
	yield* sql`
		CREATE TABLE IF NOT EXISTS zones (
			zone_id TEXT PRIMARY KEY NOT NULL,
			domain TEXT UNIQUE NOT NULL
		)
	`

	// Create email_rules table
	yield* sql`
		CREATE TABLE IF NOT EXISTS email_rules (
			id TEXT PRIMARY KEY NOT NULL,
			email TEXT UNIQUE NOT NULL,
			forward_to TEXT NOT NULL,
			zone_id TEXT NOT NULL,
			user_username TEXT,
			FOREIGN KEY (zone_id) REFERENCES zones(zone_id) ON DELETE CASCADE
		)
	`

	// Create users table
	yield* sql`
		CREATE TABLE IF NOT EXISTS users (
			username TEXT PRIMARY KEY NOT NULL,
			password TEXT NOT NULL,
			has_account INTEGER DEFAULT 0 NOT NULL,
			has_configured INTEGER DEFAULT 0 NOT NULL,
			email_verified INTEGER DEFAULT 0 NOT NULL,
			tfa_secret TEXT,
			email TEXT,
			FOREIGN KEY (email) REFERENCES email_rules(id) ON DELETE CASCADE
		)
	`

	// Create user_cookies table with composite key
	yield* sql`
		CREATE TABLE IF NOT EXISTS user_cookies (
			name TEXT NOT NULL,
			value TEXT NOT NULL,
			domain TEXT DEFAULT 'freebitco.in' NOT NULL,
			path TEXT DEFAULT '/' NOT NULL,
			expires TEXT,
			http_only INTEGER DEFAULT 0 NOT NULL,
			secure INTEGER DEFAULT 0 NOT NULL,
			same_party INTEGER DEFAULT 0 NOT NULL,
			same_site TEXT DEFAULT 'None' NOT NULL,
			user_username TEXT NOT NULL,
			PRIMARY KEY (name, domain, user_username),
			FOREIGN KEY (user_username) REFERENCES users(username) ON DELETE CASCADE
		)
	`
})
