import crypto from 'crypto';

/**
 * Generates a random username by wrapping a UUID with 'x' characters.
 *
 * @returns {string} A string in the format 'x<UUID>x', where <UUID> is a randomly generated UUID.
 */
export const getRandomUsername = (): string => `x${crypto.randomUUID()}x`;

export const getProxyUrl = (username: string = getRandomUsername()) =>
  `http://${username}:pass@127.0.0.1:8118`;
