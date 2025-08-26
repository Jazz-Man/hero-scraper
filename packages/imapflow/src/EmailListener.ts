import { EventEmitter } from "node:events";

import Imap, {
    type ImapMessage,
    type ImapMessageAttributes
} from "imap";
import { simpleParser } from "mailparser";
import type { MailOptions, TParsedMail, TSearchCriteria } from "../@types";


export class EmailListener extends EventEmitter<{
	error: [Error];
	"server:connected": [];
	"server:disconnected": [];
	mail: [TParsedMail, number, ImapMessageAttributes];
}> {
	#imap: Imap;

	private readonly markSeen: boolean;

	private readonly mailbox: string;

	private readonly fetchUnreadOnStart: boolean;

	private readonly searchFilter: TSearchCriteria[];

	constructor(options: MailOptions) {
		super();

		this.markSeen = options.markSeen ?? true;
		this.mailbox = options.mailbox ?? "INBOX";

		this.searchFilter = options.searchFilter || ["UNSEEN"];

		this.fetchUnreadOnStart = options.fetchUnreadOnStart ?? true;

		this.#imap = new Imap({
			xoauth2: options.xoauth2,
			user: options.user,
			password: options.password,
			host: options.host,
			port: options.port,
			tls: options.tls || true,
			tlsOptions: options.tlsOptions || { rejectUnauthorized: false },
			connTimeout: options.connTimeout,
			authTimeout: options.authTimeout,
			debug: options.debug,
		});

		this.#imap.once("ready", this.imapReady.bind(this));
		this.#imap.once("close", this.imapClose.bind(this));
		this.#imap.on("error", this.imapError.bind(this));
	}

	start() {
		this.#imap.connect();
	}

	stop() {
		this.#imap.end();
	}

	private imapReady() {
		this.#imap.openBox(this.mailbox, false, (err) => {
			if (err) {
				this.emit("error", err);
			} else {
				this.emit("server:connected");
				if (this.fetchUnreadOnStart) {
					this.parseUnread();
				}

				this.#imap.on("mail", this.imapMail.bind(this));
				this.#imap.on("update", this.imapMail.bind(this));
			}
		});
	}

	private imapClose() {
		this.emit("server:disconnected");
	}

	private imapError(err: Error) {
		this.emit("error", err);
	}

	private imapMail() {
		this.parseUnread();
	}

	private parseUnread() {
		this.#imap.search(this.searchFilter, (err, results) => {
			if (err) {
				this.emit("error", err);
			} else if (results.length > 0) {
				for (const result of results) {
					const f = this.#imap.fetch(result, {
						bodies: "",
						markSeen: this.markSeen,
					});

					f.once("error", (error) => {
						this.emit("error", error);
					});

					f.on("message", this.handleMessage.bind(this));
				}
			}
		});
	}

	private handleMessage(message: ImapMessage, seqno: number) {
		let attributes: ImapMessageAttributes;

		message.on("body", (stream: NodeJS.ReadableStream) => {
			let data = "";
			stream.on("data", (chunk) => {
				data += chunk.toString("UTF-8");
			});

			stream.once("end", () => {
				simpleParser(data, (err1: Error | undefined, mail: TParsedMail) => {
					if (err1) {
						this.emit("error", err1);
						return;
					}

					this.emit("mail", mail, seqno, attributes);
				});
			});
		});

		message.on("attributes", (attrs) => {
			attributes = attrs;
		});
	}
}
