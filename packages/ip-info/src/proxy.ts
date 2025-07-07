import crypto from "node:crypto";

/**
 * Generates a random username by wrapping a UUID with 'x' characters.
 * @returns {string} A string in the format 'x<UUID>x', where <UUID> is a randomly generated UUID.
 */
export const getRandomUsername = (): string => `x${crypto.randomUUID()}x`;

/**
 * @param username
 * @returns
 */
export const getProxyUrl = (username: string = getRandomUsername()) => {
	const proxy = new URL("http://127.0.0.1");

	proxy.port = "8118";
	proxy.password = "pass";
	proxy.username = username;

	return proxy.toString();
};
