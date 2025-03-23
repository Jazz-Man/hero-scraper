/// <reference types="threads" />

interface FetchRequestInit extends RequestInit {
	/**
	 * Log the raw HTTP request & response to stdout. This API may be
	 * removed in a future version of Bun without notice.
	 * This is a custom property that is not part of the Fetch API specification.
	 * It exists mostly as a debugging tool
	 */
	verbose?: boolean;
	/**
	 * Override http_proxy or HTTPS_PROXY
	 * This is a custom property that is not part of the Fetch API specification.
	 */
	proxy?: string;

	/**
	 * Override the default TLS options
	 */
	tls?: {
		rejectUnauthorized?: boolean | undefined; // Defaults to true
		checkServerIdentity?: any; // TODO: change `any` to `checkServerIdentity`
	};
}

declare module "bun" {
	interface Env {
		EMAIL_ADDRESS: string;
		EMAIL_PASSWORD: string;
		IMAP_SERVER: string;
		IMAP_PORT: number;
	}
}
