import { Database as BunDatabase, type SQLQueryBindings } from "bun:sqlite";
import BunStatement, { type IStatement } from "./statement.ts";

import type {
	Database as BetterSqliteDatabase,
	SerializeOptions,
	Transaction,
} from "better-sqlite3";

interface IDatabaseBase
	extends Omit<
		BetterSqliteDatabase,
		"prepare" | "memory" | "readonly" | "name"
	> {
	open: boolean;

	prepare<ReturnType, ParamsType extends SQLQueryBindings | SQLQueryBindings[]>(
		sqlQuery: string,
		params?: ParamsType,
	): IStatement<
		ReturnType,
		ParamsType extends unknown[] ? ParamsType : [ParamsType]
	>;
}

type TOptions = {
	readonly?: boolean | undefined;
	fileMustExist?: boolean | undefined;
	timeout?: number | undefined;
	verbose?:
		| ((message?: unknown, ...additionalArgs: unknown[]) => void)
		| undefined;
	nativeBinding?: string | undefined;
	readwrite?: boolean;
	safeIntegers?: boolean;
	strict?: boolean;
};

export default class Database implements IDatabaseBase {
	memory = true;
	readonly = false;
	open = false;

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	prepare<ReturnType = unknown, ParamsType extends SQLQueryBindings[] = any[]>(
		source: string,
	): BunStatement<ReturnType, ParamsType> {
		return new BunStatement<ReturnType, ParamsType>(this.#db, source);
	}

	// @ts-ignore
	#db: BunDatabase;
	#filename: string;
	#options: TOptions | undefined;

	constructor(
		filename = ":memory:",
		options: Partial<TOptions> = {
			strict: true,
			safeIntegers: true,
		},
	) {
		this.#filename = filename;
		this.#init(filename, options);
	}

	get inTransaction(): boolean {
		return this.#db.inTransaction;
	}

	transaction<F extends (...params: unknown[]) => unknown>(
		fn: F,
	): Transaction<F> {
		return this.#db.transaction(fn) as Transaction<F>;
	}

	// @ts-ignore
	exec(source: string): this {
		this.#db.exec(source);
		return this;
	}

	// @ts-ignore
	pragma(source: string, options?: unknown): this {
		return this.exec(`PRAGMA ${source}`);
	}

	// @ts-ignore
	aggregate(...params: unknown): this {
		throw new Error("Method not implemented.");
	}

	// @ts-ignore
	loadExtension(path: string): this {
		this.#db.loadExtension(path);
		return this;
	}

	// @ts-ignore
	close(): this {
		this.#db.close();
		this.open = false;
		return this;
	}

	// @ts-ignore
	defaultSafeIntegers(toggleState: boolean | undefined = undefined): this {
		if (!toggleState) {
			return this;
		}

		if (this.#options?.safeIntegers === toggleState) {
			return this;
		}

		this.#init(this.#filename, { ...this.#options, safeIntegers: toggleState });
		return this;
	}

	// @ts-ignore
	backup(...params: unknown) {
		throw new Error("Method not implemented.");
	}

	// @ts-ignore
	table(name: string, options: unknown): this {
		throw new Error("Method not implemented.");
	}

	// @ts-ignore
	unsafeMode(unsafe?: boolean): this {
		// throw new Error('Method not implemented.');

		return this;
	}

	serialize(options?: SerializeOptions): Buffer {
		return this.#db.serialize(options?.attached);
	}

	// @ts-ignore
	function(...params: unknown): this {
		throw new Error("Method not implemented.");
	}

	#init(filename = ":memory:", options?: TOptions) {
		this.#filename = filename;
		this.#options = options;

		this.readonly = !!this.#options?.readonly;
		this.memory = this.#filename === ":memory:";

		try {
			this.#db = new BunDatabase(this.#filename, {
				readonly: this.readonly,
				create: this.#options?.fileMustExist ?? false,
				safeIntegers: this.#options?.safeIntegers ?? false,
			});
			this.open = true;
		} catch (e) {
			this.open = false;
			throw e;
		}
	}

	[Symbol.dispose]() {
		this.close();
	}
}
