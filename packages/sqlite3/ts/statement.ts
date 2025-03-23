import type {
	Database as BunDatabase,
	Statement as BunStatementType,
	Changes,
	SQLQueryBindings,
} from "bun:sqlite";

import type { ColumnDefinition, Statement } from "better-sqlite3";

export type StatementParams<T extends SQLQueryBindings[]> =
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	T extends any[] ? T : [T];

export interface IStatement<
	Result = unknown,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	ParamsType extends SQLQueryBindings[] = any[],
	// @ts-ignore
> extends Omit<Statement<ParamsType, Result>, "database"> {}

export default class BunStatement<
	ReturnType = unknown,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	ParamsType extends SQLQueryBindings[] = any[],
> implements IStatement
{
	readonly: boolean;
	busy: boolean;
	#statement: BunStatementType<ReturnType, StatementParams<ParamsType>>;

	#isPluck = false;
	#params: StatementParams<ParamsType> | undefined = undefined;

	constructor(
		db: BunDatabase,
		public source: string,
	) {
		this.readonly = false;
		this.busy = false;
		this.#statement = db.prepare<ReturnType, ParamsType>(this.source);
	}

	pluck(isPluck = true): this {
		this.#isPluck = isPluck;
		return this;
	}
	expand(toggleState?: boolean): this {
		throw new Error("Method not implemented.");
	}
	raw(toggleState?: boolean): this {
		return this;
	}
	bind(...params: StatementParams<ParamsType>): this {
		this.#params = params;
		return this;
	}
	columns(): ColumnDefinition[] {
		throw new Error("Method not implemented.");
	}
	safeIntegers(toggleState?: boolean): this {
		throw new Error("Method not implemented.");
	}

	run(...params: StatementParams<ParamsType>): Changes {
		return this.#statement.run(...this.#prepareParams(params));
	}

	get(...params: StatementParams<ParamsType>): ReturnType | null {
		const result = this.#statement.get(...this.#prepareParams(params));

		if (result === null) {
			return null;
		}

		return this.#isPluck
			? // biome-ignore lint/suspicious/noExplicitAny: <explanation>
				(Object.values(result as any).at(0) as ReturnType)
			: result;
	}

	#prepareParams(
		params: StatementParams<ParamsType>,
	): StatementParams<ParamsType> {
		return this.#params || params;
	}

	all(...params: StatementParams<ParamsType>): ReturnType[] {
		if (this.#isPluck) {
			return this.#statement
				.values(...this.#prepareParams(params))
				.map((result) => result.at(0)) as ReturnType[];
		}

		return this.#statement.all(...this.#prepareParams(params));
	}

	iterate(
		...params: StatementParams<ParamsType>
	): IterableIterator<ReturnType> {
		return this.#statement.iterate(...this.#prepareParams(params));
	}
}
