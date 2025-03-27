declare module "bun" {
	interface Env {
		EMAIL_ADDRESS: string;
		EMAIL_PASSWORD: string;
		IMAP_SERVER: string;
		IMAP_PORT: number;
	}
}
