const BunStatement = require('./statement.cjs');

const { Database: BunDatabase } = require('bun:sqlite');

class Database {
  /**
   * @type {import('bun:sqlite').Database}
   */
  #db;

  /**
   * @type {string}
   */
  #filename;
  /**
   * @type {Object}
   */
  #options;
  /**
   * Constructs a new Database instance with the specified filename and options.
   * Initializes the database connection using the provided options or defaults.
   *
   * @param {string} filename - The name of the database file.
   * @param {Object} options - Configuration options for the database connection.
   * @param {boolean} [options.readonly=false] - If true, opens the database in read-only mode.
   * @param {boolean} [options.fileMustExist=false] - If true, throws an error if the database file does not exist.
   * @param {number} [options.timeout=undefined] - The timeout duration for database operations.
   * @param {boolean} [options.verbose=undefined] - If true, enables verbose logging.
   * @param {boolean} [options.nativeBinding=undefined] - If true, uses native bindings.
   * @param {boolean} [options.readwrite=true] - If true, allows read-write access to the database.
   * @param {boolean} [options.safeIntegers=true] - If true, ensures integers are handled safely.
   * @param {boolean} [options.strict=true] - If true, enables strict mode for database operations.
   */

  constructor(filename, options) {
    this.memory = true;
    this.readonly = false;
    this.open = false;

    this.#filename = filename;

    this.#options = {
      readonly: false,
      fileMustExist: true,
      readwrite: true,
      safeIntegers: true,
      strict: false,
      ...options
    };

    this.#init(this.#options);
  }

  prepare(source) {
    return new BunStatement(this.#db, source);
  }

  inTransaction() {
    return this.#db.inTransaction;
  }

  transaction(fn) {
    return this.#db.transaction(fn);
  }

  exec(source) {
    this.#db.run(source);
    return this;
  }

  pragma(source, options) {
    return this.exec('PRAGMA ' + source);
  }

  loadExtension(path) {
    this.#db.loadExtension(path);
    return this;
  }

  close() {
    this.#db.close();
    this.open = false;
    return this;
  }

  defaultSafeIntegers(toggleState) {
    if (!toggleState) {
      return this;
    }

    if (this.#options.safeIntegers === toggleState) {
      return this;
    }

    this.#init({
      ...this.#options,
      safeIntegers: toggleState
    });
    return this;
  }

  unsafeMode() {
    return this;
  }

  serialize(options) {
    return this.#db.serialize(options && options.attached);
  }

  #init(options) {
    this.readonly = !!options.readonly;
    this.memory = this.#filename === ':memory:';

    try {
      this.#db = new BunDatabase(this.#filename, {
        readonly: this.readonly,
        create: options.fileMustExist || false,
        safeIntegers: options.safeIntegers || false
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

module.exports = Database;
