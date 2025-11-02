import { Console, Effect, Stream } from "effect";
import { EmailListener, EmailListenerLive } from "./tmp/EmailListenerEffect";

const program = Effect.gen(function* () {
	const listener = yield* EmailListener;

	yield* listener.messages.pipe(
		Stream.tap((message) => {
			const html = message.mail.html;

			const textHandler: HTMLRewriterTypes.HTMLRewriterElementContentHandlers =
				{
					text(textNode) {
						const raw = textNode.text
							.replace(/\s{2,}/isu, " ")
							.replaceAll("&lt;", "<")
							.replace("&nbsp;", " ")
							.replace(/[\t\n]+/g, "\n")
							.trim();

						const hasN = raw.includes("\n");

						const trim = raw.trim();

						// const isEmpty = trim.length === 0;

						// if (isEmpty) {
						// 	if (textNode.lastInTextNode) {
						// 		textNode.remove();
						// 		return;
						// 	}

						// 	if (!hasN) {
						// 		textNode.remove();
						// 		return;
						// 	}
						// }

						// console.log({ trim, raw, hasN, isEmpty });

						// if (isEmpty && hasN) {
						// 	console.log({ trim, raw });
						// 	// textNode.remove();
						// 	// textNode.replace("\n", { html: true });
						// 	return;
						// }

						// if (trim !== raw) {
						// textNode.replace(`${trim}${hasN ? "\n" : ""}`, { html: true });
						// }
					},
				};

			const rewriter = new HTMLRewriter()
				.on("*", {
					element(element) {
						if (element.removed) {
							return;
						}

						if (element.tagName === "style") {
							element.remove();
							return;
						}

						if (element.hasAttribute("style")) {
							element.removeAttribute("style");
						}

						const attributes = new Map<string, string>(element.attributes);

						if (attributes.size) {
							attributes.forEach((value, key) => {
								const val = value.trim();

								if (val.length === 0) {
									element.removeAttribute(key);
								} else {
									element.setAttribute(key, val);
								}
							});
						}
					},
					comments(comment) {
						if (comment.removed) {
							return;
						}

						comment.remove();
					},
					...textHandler,
				})
				.on("table,tbody,tr,td", {
					element(element) {
						if (element.removed) {
							return;
						}

						element.removeAndKeepContent();
					},
				})
				.on("img", {
					element(img) {
						// console.log(img);
						// console.log(Object.fromEntries(img.attributes));
					},
				})
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

	yield* listener.stop;
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
				searchFilter: [
					// ["FROM", "vsokolyk@gmail.com"],
					// ["FROM", "googledevelopers-noreply@google.com"],
					["FROM", "tanzu@broadcom.com"],
					// ["FROM", "status@hcaptcha.com"],
				],
			}),
		),
	),
);
