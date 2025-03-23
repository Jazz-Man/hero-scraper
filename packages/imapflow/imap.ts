import { inspect } from "bun";
import Imap, { type MailBoxes } from "imap";

const imap = new Imap({
	user: Bun.env.EMAIL_ADDRESS,
	password: Bun.env.EMAIL_PASSWORD,
	host: Bun.env.IMAP_SERVER,
	port: Bun.env.IMAP_PORT,
	tls: true,
	tlsOptions: { rejectUnauthorized: false },
	// debug: console.log,
	keepalive: false,
});

imap.on("ready", () => {
	console.log("IMAP connection ready");

	imap.getSubscribedBoxes((err: Error, boxes: MailBoxes) => {
		if (err) {
			console.error("Error getting folders", err);
			return;
		}
		console.log("All folders", boxes);

		imap.end();
	});

	imap.openBox("INBOX", false, (err, box) => {
		if (err) {
			console.error("Failed to open mailbox:", err);
			imap.end();
			throw err;
		}

		imap.search(
			[
				// 'UNSEEN',
				["FROM", "freebitco.in"],
				// ['SUBJECT', '$200 in Free BTC Up for Grabs!']
				// ['SINCE', new Date()]
			],
			(err, results) => {
				if (!results || !results.length) {
					console.log(
						"The server didn't find any emails matching the specified criteria",
					);
					imap.end();
					return;
				}

				const f = imap.fetch(results, {
					//you can set amount range like '1:2' or 'results' for all results
					bodies: "",
					struct: true,
					markSeen: false,
				});

				f.on("message", (msg, seqno) => {
					msg.on("body", (stream, info) => {
						let buffer = "";
						stream.on("data", (chunk) => {
							buffer += chunk.toString("utf8");
						});
						stream.once("end", () => {
							console.log(
								// prefix + 'Parsed header: %s',
								inspect(Imap.parseHeader(buffer), {
									colors: true,
									compact: false,
								}),
							);
						});
					});

					// msg.on('body', (stream) => {
					//   stream.on('data', (chunk) => {
					//     console.log(chunk.toString());
					//   });
					// });
				});

				// f.on('end', () => {
				//   console.log('Done fetching all messages!');
				//   imap.end();
				// });

				// console.log(results);

				// const fetch = imap.fetch(results, {
				//   bodies: '',
				//   struct: true
				// });
			},
		);

		console.log("Opened mailbox:", box);
	});
});

imap.on("error", (err: Error) => {
	console.error("IMAP connection error:", err);
});

imap.connect();
