import crypto from "node:crypto";

/**
 * Generates a random username by wrapping a UUID with 'x' characters.
 * @deprecated
 * @returns {string} A string in the format 'x<UUID>x', where <UUID> is a randomly generated UUID.
 */
export const getRandomUsername = (): string => `x${crypto.randomUUID()}x`;

/**
 * @deprecated
 * @param username
 * @returns
 */
export const getProxyUrl = (username: string = getRandomUsername()) =>
	`http://${username}:pass@127.0.0.1:8118`;
