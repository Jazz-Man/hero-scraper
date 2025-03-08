export default class BunStatement {
  /**
   * @type {boolean}
   */
  #isPluck = false;

  /**
   * @type {StatementParams<*> | undefined}
   */
  #params = undefined;

  /**
   *  @type {import('bun:sqlite').Statement<*, StatementParams<*>>}
   */
  #statement;

  /**
   * Initializes a new instance of the BunStatement class.
   *
   * @param {import('bun:sqlite').Database} db - The database connection object.
   * @param {string} source - The SQL query string to prepare.
   *
   * @property {Object} _statement - The prepared SQL statement.
   * @property {boolean} _isPluck - Flag indicating if only the first column of the result should be returned.
   * @property {Array|null} _params - Parameters to bind to the SQL statement.
   * @property {boolean} readonly - Indicates if the statement is read-only.
   * @property {boolean} busy - Indicates if the statement is currently executing.
   * @property {string} source - The original SQL query string.
   */

  constructor(db, source) {
    this.#statement = db.prepare(source);
    this.readonly = false;
    this.busy = false;
    this.source = source;
  }

  /**
   * Sets the pluck mode for the statement, determining if only the first column
   * of the result should be returned.
   *
   * @param {boolean} isPluck - If true, only the first column of the result will be returned.
   *                            If false, the entire result will be returned.
   * @returns {BunStatement} The current instance for method chaining.
   */
  pluck(isPluck) {
    this.#isPluck = isPluck !== false;
    return this;
  }

  expand(toggleState) {
    throw new Error('Method not implemented.');
  }

  raw(toggleState) {
    return this;
  }

  /**
   * Binds the provided arguments as parameters to the SQL statement.
   *
   * @param {...StatementParams<*>} params - The parameters to bind to the SQL statement.
   * @returns {BunStatement} The current instance for method chaining.
   */
  bind(...params) {
    this.#params = params;
    return this;
  }

  /**
   * Placeholder method for retrieving column information from the SQL statement.
   * Currently not implemented and will throw an error if called.
   *
   * @throws {Error} Method not implemented.
   */
  columns() {
    throw new Error('Method not implemented.');
  }

  safeIntegers(toggleState) {
    throw new Error('Method not implemented.');
  }

  /**
   * @param {StatementParams<*>} params
   * @return {*}
   */
  run(...params) {
    return this.#statement.run(...this.#prepareParams(params));
  }

  /**
   * @param {StatementParams<*>} params
   * @return {*|null}
   */
  get(...params) {
    const result = this.#statement.get(...this.#prepareParams(params));

    if (result === null) {
      return null;
    }

    return this.#isPluck ? Object.values(result).at(0) : result;
  }

  /**
   *
   * @param {StatementParams<*>} params
   * @return {*}
   */
  all(...params) {
    params = this.#prepareParams(params);

    if (this.#isPluck) {
      return this.#statement.values(...params).map((result) => result.at(0));
    }

    return this.#statement.all(...params);
  }

  /**
   * @param {StatementParams<*>} params
   * @return {IterableIterator<*>}
   */
  iterate(...params) {
    return this.#statement.iterate(...this.#prepareParams(params));
  }

  /**
   * @param {StatementParams<*>} params
   * @return {StatementParams<*>}
   */
  #prepareParams(params) {
    return this.#params || params;
  }
}
