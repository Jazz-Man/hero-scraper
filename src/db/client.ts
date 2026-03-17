import { SqliteClient } from "@effect/sql-sqlite-bun"
import { Config } from "effect"

// Client layer with Effect Config integration
// Reads DATABASE_PATH from ENV
export const DatabaseLayer = SqliteClient.layerConfig(
	Config.string("DATABASE_PATH").pipe(
		Config.map((filename) => ({ filename })),
	),
)

