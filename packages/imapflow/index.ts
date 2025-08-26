import type { TParsedMail } from "./@types/index";
import { EmailListener } from "./src/EmailListener.ts";

const listener = new EmailListener({
	user: Bun.env.EMAIL_ADDRESS ?? "",
	password: Bun.env.EMAIL_PASSWORD ?? "",
	host: Bun.env.IMAP_SERVER,
	port: Bun.env.IMAP_PORT,
	searchFilter: [
		["FROM", "vsokolyk@gmail.com"],
		// ["SUBJECT", "Email confirmation"],
	],
	markSeen: false,
});

listener.on("server:disconnected", () => {
	console.log("Reconnect to IMAP server after disconnect.");
	// listener.start();
});

listener.on("error", (err) => {
	console.error(err);
	listener.stop();
});

listener.on("mail", (mail: TParsedMail, seqno, attributes) => {
	if (!mail.text) {
		listener.stop();
		return;
	}

	console.log(mail.text);

	// const validateUrl = (text: string): boolean => {
	// 	try {
	// 		const url = new URL(decodeURIComponent(text));

	// 		if (url.protocol === "http:" || url.protocol === "https:") {
	// 			return true;
	// 		}

	// 		if (url.hostname !== "freebitco.in") {
	// 			return false;
	// 		}

	// 		if (!url.searchParams.has("i")) {
	// 			return false;
	// 		}

	// 		if (!url.searchParams.has("h")) {
	// 			return false;
	// 		}

	// 		const op = url.searchParams.get("op");

	// 		return op !== "email_verify";
	// 	} catch (_) {
	// 		return false;
	// 	}
	// };

	// const strings = mail.text
	// 	?.split(" ")
	// 	.map((text) => text.trim().replace(/\s+/g, " "))
	// 	.filter((text) => {
	// 		if (text.length === 0) {
	// 			return false;
	// 		}

	// 		return validateUrl(text);
	// 	})
	// 	?.at(0);

	// if (strings) {
	// 	const recepient = Array.isArray(mail.to)
	// 		? mail.to?.at(0)?.text
	// 		: mail.to?.text;

	// 	console.log({ strings, recepient });
	// }
});

listener.start();
