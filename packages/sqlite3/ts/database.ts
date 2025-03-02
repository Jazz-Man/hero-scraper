import { Database as BunDatabase, type SQLQueryBindings } from 'bun:sqlite';
import BunStatement from './statement.ts';
import type {
  IDatabaseBase,
  SerializeOptions,
  Transaction,
  VirtualTableOptions
} from './types';

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
  memory: boolean;
  readonly: boolean;
  open: boolean;

  prepare<ReturnType = unknown, ParamsType extends SQLQueryBindings[] = any[]>(
    source: string
  ): BunStatement<ReturnType, ParamsType> {
    return new BunStatement<ReturnType, ParamsType>(this.#db, source);
  }

  #db: BunDatabase;
  #filename: string;
  #options: TOptions | undefined;

  constructor(
    filename: string = ':memory:',
    options: Partial<TOptions> = {
      strict: true,
      safeIntegers: true
    }
  ) {
    this.#init(filename, options);
  }

  get inTransaction(): boolean {
    return this.#db.inTransaction;
  }

  transaction<F extends (...params: any[]) => unknown>(fn: F): Transaction<F> {
    return this.#db.transaction(fn) as Transaction<F>;
  }

  exec(source: string): this {
    this.#db.exec(source);
    return this;
  }

  pragma(source: string, options?: any): this {
    return this.exec(`PRAGMA ${source}`);
  }

  aggregate(...params: any): this {
    throw new Error('Method not implemented.');
  }

  loadExtension(path: string): this {
    this.#db.loadExtension(path);
    return this;
  }

  close(): this {
    this.#db.close();
    this.open = false;
    return this;
  }

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

  backup(...params: any) {
    throw new Error('Method not implemented.');
  }

  table(name: string, options: VirtualTableOptions): this {
    throw new Error('Method not implemented.');
  }

  unsafeMode(unsafe?: boolean): this {
    throw new Error('Method not implemented.');
  }

  serialize(options?: SerializeOptions): Buffer {
    return this.#db.serialize(options?.attached);
  }

  function(...params: any): this {
    throw new Error('Method not implemented.');
  }

  #init(filename: string = ':memory:', options?: TOptions) {
    this.#filename = filename;
    this.#options = options;

    this.readonly = !!this.#options?.readonly;
    this.memory = this.#filename === ':memory:';

    try {
      this.#db = new BunDatabase(this.#filename, {
        readonly: this.readonly,
        create: this.#options?.fileMustExist ?? false,
        safeIntegers: this.#options?.safeIntegers ?? false
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
