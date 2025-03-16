/**
 * @param {number} length
 * @return {Buffer | Buffer<ArrayBuffer>}
 */
function allocateAsciiBuffer(length) {
  return Buffer.alloc(length, 'ascii');
}

/**
 * @param {string} str
 * @return {string}
 */
function encode(str) {
  const b = allocateAsciiBuffer(str.length * 2);
  let bi = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    b[bi++] = c >> 8;
    b[bi++] = c & 0xff;
  }
  return b.toString('base64').replace(/=+$/, '');
}

/**
 * @param {string} str
 * @return {Buffer<ArrayBuffer>}
 */

function allocateBase64Buffer(str) {
  return Buffer.from(str, 'base64');
}

/**
 * @param {string} str
 * @return {string}
 */
function decode(str) {
  const b = allocateBase64Buffer(str);

  /**
   * @type {string[]}
   */
  const r = [];
  for (let i = 0; i < b.length; ) {
    r.push(String.fromCharCode((b[i++] << 8) | b[i++]));
  }
  return r.join('');
}

/**
 * @param {string} chars
 * @return {string}
 */
function escape(chars) {
  return chars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const setD = 'A-Za-z0-9' + escape("'(),-./:?");
const setO = escape('!"#$%&*;<=>@[]^_\'{|}');
const setW = escape(' \r\n\t');

/**
 *
 * @type {Record<string, RegExp>}
 */
const regexes = {};
const regexAll = new RegExp(`[^${setW}${setD}${setO}]+`, 'g');

/**
 * @type {{
 *     encode: (str: string) => string;
 *     decode: (str: string) => string;
 * }}
 */
export const imap = {};

/**
 * @param {string} str
 * @param {string} mask
 * @return {string}
 */
export function encodeUTF7(str, mask = '') {
  if (!regexes[mask]) {
    regexes[mask] = new RegExp(`[^${setD}${escape(mask)}]+`, 'g');
  }
  return str.replace(
    regexes[mask],
    (chunk) => `+${chunk === '+' ? '' : encode(chunk)}-`
  );
}

/**
 * @param {string} str
 * @return {string}
 */
export function encodeUTF7All(str) {
  return str.replace(
    regexAll,
    (chunk) => '+' + (chunk === '+' ? '' : encode(chunk)) + '-'
  );
}

/**
 *
 * @param {string} str
 * @return {string}
 */
imap.encode = function (str) {
  return str.replace(/&/g, '&-').replace(/[^\x20-\x7e]+/g, function (chunk) {
    // & is represented by an empty sequence &-, otherwise call encode().
    chunk = (chunk === '&' ? '' : encode(chunk)).replace(/\//g, ',');
    return '&' + chunk + '-';
  });
};

/**
 * @param {string} str
 * @return {string}
 */
export function decodeUTF7(str) {
  return str.replace(/\+([A-Za-z0-9\/]*)-?/gi, (_, chunk) => {
    return chunk === '' ? '+' : decode(chunk);
  });
}

/**
 * @param {string} str
 * @return {string}
 */
imap.decode = function (str) {
  return str.replace(/&([^-]*)-/g, (_, chunk) =>
    chunk === '' ? '&' : decode(chunk.replace(/,/g, '/'))
  );
};
