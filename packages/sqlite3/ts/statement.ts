import {
  Database as BunDatabase,
  type Statement as BunStatementType,
  type Changes,
  type SQLQueryBindings
} from 'bun:sqlite';
import { type ColumnDefinition, type IStatement } from './types';

type StatementParams<T extends SQLQueryBindings[]> = T extends any[] ? T : [T];

export default class BunStatement<
  ReturnType = any,
  ParamsType extends SQLQueryBindings[] = any[]
> implements IStatement
{
  readonly: boolean;
  busy: boolean;
  #statement: BunStatementType<ReturnType, StatementParams<ParamsType>>;

  #isPluck: boolean = false;
  #params: StatementParams<ParamsType>;

  constructor(
    db: BunDatabase,
    public source: string
  ) {
    this.#statement = db.prepare<ReturnType, ParamsType>(this.source);
  }

  pluck(isPluck: boolean = true): this {
    this.#isPluck = isPluck;
    return this;
  }
  expand(toggleState?: boolean): this {
    throw new Error('Method not implemented.');
  }
  raw(toggleState?: boolean): this {
    return this;
  }
  bind(...params: StatementParams<ParamsType>): this {
    this.#params = params;
    return this;
  }
  columns(): ColumnDefinition[] {
    throw new Error('Method not implemented.');
  }
  safeIntegers(toggleState?: boolean): this {
    throw new Error('Method not implemented.');
  }

  // Виконання запиту з параметрами (run повертає інформацію про виконання)
  run(...params: StatementParams<ParamsType>): Changes {
    return this.#statement.run(...this.#prepareParams(params));
  }

  // Повернення першого результату запиту
  get(...params: StatementParams<ParamsType>): ReturnType | null {
    const result = this.#statement.get(...this.#prepareParams(params));

    if (result === null) {
      return null;
    }

    return this.#isPluck
      ? (Object.values(result as any).at(0) as ReturnType)
      : result;
  }

  #prepareParams(
    params: StatementParams<ParamsType>
  ): StatementParams<ParamsType> {
    return this.#params?.length > 0 ? this.#params : params;
  }

  // Повернення всіх рядків запиту
  all(...params: StatementParams<ParamsType>): ReturnType[] {
    params = this.#prepareParams(params);

    if (this.#isPluck) {
      return this.#statement
        .values(...params)
        .map((result) => result.at(0)) as ReturnType[];
    }

    return this.#statement.all(...params);
  }
  // Ітерація по результатах запиту
  iterate(
    ...params: StatementParams<ParamsType>
  ): IterableIterator<ReturnType> {
    return this.#statement.iterate(...this.#prepareParams(params));
  }
}
