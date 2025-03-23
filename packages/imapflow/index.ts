import type { ParsedMail } from "mailparser";
import { EmailListener } from "./src/EmailListener";

import decode from "html-entities-decode";

const listener = new EmailListener({
	user: Bun.env.EMAIL_ADDRESS,
	password: Bun.env.EMAIL_PASSWORD,
	host: Bun.env.IMAP_SERVER,
	port: Bun.env.IMAP_PORT,
	tls: true,
	tlsOptions: { rejectUnauthorized: false },
	mailbox: "INBOX",
	searchFilter: [
		["FROM", "freebitco.in"],
		// ['TO', 'adrienne2@vsokolyk.pp.ua']
		// ['SUBJECT', 'Test']
	],
	markSeen: false,
	fetchUnreadOnStart: true,
	// debug: console.log
});

listener.start();

listener.on("server:disconnected", () => {
	console.log("Reconnect to IMAP server after disconnect.");
	// listener.start();
});

listener.on("error", (err) => {
	console.error(err);
	listener.stop();
});

listener.on("mail", (mail: ParsedMail, seqno, attributes) => {
	if (!mail.html) {
		listener.stop();
	}

	const validateUrl = (url: string): boolean | URL => {
		if (url.trim() === "") {
			return false;
		}

		try {
			const link = new URL(decodeURIComponent(url));

			if (link.host !== "freebitco.in") {
				return false;
			}

			return link;
		} catch (e) {
			return false;
		}
	};

	const validateTextLink = (text: string): boolean | URL => {
		const textLink = text.trim().replace(/\s+/g, " ");

		if (textLink.length === 0) {
			return false;
		}

		return validateUrl(textLink);
	};

	let validLink: URL | undefined | boolean = undefined;

	const rewriter = new HTMLRewriter()
		.on("*", {
			element(element) {
				if (typeof validLink !== "undefined") {
					element.remove();
				} else {
					if (element.tagName !== "a") {
						element.removeAndKeepContent();
						return;
					}

					if (!element.hasAttribute("href")) {
						element.removeAndKeepContent();
						return;
					}
					const href = element.getAttribute("href");

					const url = validateUrl(href as string);

					if (!url) {
						element.remove();
						return;
					}

					if (!validLink) {
						validLink = url;
					}
				}
			},
			comments(comment) {
				comment.remove();
			},
			text(text) {
				if (typeof validLink !== "undefined") {
					text.remove();
				} else {
					const url = validateTextLink(text.text);

					if (!url) {
						text.remove();
						return;
					}
				}
			},
		})
		.onDocument({
			doctype(doctype) {
				doctype.remove();
			},
			comments(comment) {
				comment.remove();
			},
			text(text) {
				if (typeof validLink !== "undefined") {
					text.remove();
				} else {
					const textLink = validateTextLink(text.text);

					if (!textLink) {
						text.remove();
						return;
					}

					if (!validLink) {
						validLink = textLink;
					}
				}
			},
		});

	rewriter.transform(decode(mail.html as string));

	if (validLink) {
		console.group("___;");
		console.log(validLink);
		console.groupEnd();
	}

	// listener.stop();
});
