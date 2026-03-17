import { SqlClient } from "effect/unstable/sql/SqlClient";
import { Effect } from "effect";

export default Effect.gen(function* () {
	const sql = yield* SqlClient;

	// Index for has_account filter
	yield* sql`CREATE INDEX IF NOT EXISTS idx_users_has_account ON users(has_account)`;

	// Index for email_rules zone lookup
	yield* sql`CREATE INDEX IF NOT EXISTS idx_email_rules_zone ON email_rules(zone_id)`;

	// Index for user_cookies user lookup
	yield* sql`CREATE INDEX IF NOT EXISTS idx_user_cookies_user ON user_cookies(user_username)`;
});
