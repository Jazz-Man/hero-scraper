import { Console, Effect, Stream } from "effect";
import { EmailListener, EmailListenerLive } from "./tmp/EmailListenerEffect";

const program = Effect.gen(function* () {
	const listener = yield* EmailListener;

	yield* listener.messages.pipe(
		Stream.tap((message) => {
			// Console.log(message.mail.html);
			const html = message.mail.html;

			const textHandler: HTMLRewriterTypes.HTMLRewriterElementContentHandlers =
				{
					text(textNode) {
						const raw = textNode.text.replaceAll("&lt;", "<");
						// .replace(/\s+/, " ")

						const hasN = raw.includes("\n");

						const trim = raw.trim();

						const isEmpty = trim.length === 0;
						if (textNode.lastInTextNode && isEmpty) {
							textNode.remove();
							return;
						}

						// console.log({ trim, raw, hasN, isEmpty });

						if (isEmpty && hasN) {
							// textNode.remove();
							// textNode.replace("");
							// return;
						}

						if (trim !== raw) {
							textNode.replace(`${trim}${hasN ? "\n" : ""}`, { html: true });

							// return;
						}
					},
				};

			const rewriter = new HTMLRewriter()
				.on("*", {
					element(element) {
						if (element.removed) {
							return;
						}

						// if (element.hasAttribute("style")) {
						// 	element.removeAttribute("style");
						// }
					},
					// comments(comment) {
					// 	console.log(comment);
					// },
					...textHandler,
				})
				// .on("p", {
				// 	element(paragraph) {
				// 		// console.log(paragraph);
				// 	},
				// 	...textHandler,
				// })
				.on("br", {
					element(node) {
						node.replace("<br/>", { html: true });
					},
				});

			rewriter.onDocument(textHandler);

			const result = rewriter.transform(html as string);

			return Console.log(result);
		}),
		Stream.runDrain,
	);

	// yield* listener.stop;
}).pipe(Effect.catchAll(Console.error));

Effect.runFork(
	program.pipe(
		Effect.scoped,
		Effect.provide(
			EmailListenerLive({
				user: Bun.env.EMAIL_ADDRESS ?? "",
				password: Bun.env.EMAIL_PASSWORD ?? "",
				host: Bun.env.IMAP_SERVER,
				port: Bun.env.IMAP_PORT,
				fetchUnreadOnStart: true,
				markSeen: false,
				searchFilter: [["FROM", "vsokolyk@gmail.com"]],
			}),
		),
	),
);
