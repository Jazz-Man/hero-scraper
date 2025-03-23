import type { SerializeOptions, Statement, Transaction } from "better-sqlite3";

import { Database as BunDatabase, type SQLQueryBindings } from "bun:sqlite";

export { BunDatabase, type SerializeOptions, type Transaction };

export interface VirtualTableOptions {
	rows: (...params: unknown[]) => Generator;
	columns: string[];
	parameters?: string[] | undefined;
	safeIntegers?: boolean | undefined;
	directOnly?: boolean | undefined;
}

export interface IDatabaseBase
	extends Omit<
		BetterSqlite3.Database,
		"prepare" | "memory" | "readonly" | "name"
	> {
	open: boolean;

	prepare<ReturnType, ParamsType extends SQLQueryBindings | SQLQueryBindings[]>(
		sqlQuery: string,
		params?: ParamsType,
	): IStatement<
		ReturnType,
		ParamsType extends any[] ? ParamsType : [ParamsType]
	>;
}

export interface IStatement<
	Result = unknown,
	ParamsType extends SQLQueryBindings[] = any[],
> extends Omit<Statement<ParamsType, Result>, "database"> {}
