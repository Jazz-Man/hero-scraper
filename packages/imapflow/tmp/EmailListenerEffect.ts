import {
	Chunk,
	Context,
	Effect,
	Layer,
	Option,
	type Scope,
	Stream,
} from "effect";
import Imap, { type ImapMessage, type ImapMessageAttributes } from "imap";
import { simpleParser } from "mailparser";
import type { MailOptions, TParsedMail } from "../@types/index.js";

// Email message type
export interface EmailMessage {
	readonly mail: TParsedMail;
	readonly sequenceNumber: number;
	readonly attributes: ImapMessageAttributes;
}

// Service interface
export interface EmailListenerService {
	readonly messages: Stream.Stream<EmailMessage, Error, Scope.Scope>;
	readonly start: Effect.Effect<void, Error, Scope.Scope>;
	readonly stop: Effect.Effect<void, never>;
}

// Service tag
export class EmailListener extends Context.Tag("EmailListener")<
	EmailListener,
	EmailListenerService
>() {}

// Create service implementation
const makeEmailListener = (options: MailOptions): EmailListenerService => {
	let imap: Imap | null = null;

	const fetchUnreadOnStart = options.fetchUnreadOnStart ?? true;

	const start = Effect.gen(function* () {
		if (imap) {
			return;
		}

		imap = new Imap({
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

		yield* Effect.addFinalizer(() =>
			Effect.sync(() => {
				if (imap && imap.state !== "disconnected") {
					imap.end();
				}
			}),
		);

		yield* Effect.async<void, Error>((resume) => {
			const onReady = () => {
				imap?.openBox(options.mailbox || "INBOX", false, (err) => {
					if (err) {
						resume(Effect.fail(err));
					} else {
						resume(Effect.void);
					}
				});
			};

			const onError = (err: Error) => {
				resume(Effect.fail(err));
			};

			imap?.once("ready", onReady);
			imap?.once("error", onError);
			imap?.connect();
		});
	});

	const stop = Effect.sync(() => {
		if (imap) {
			imap.end();
			imap = null;
		}
	});

	const messages = Stream.unwrapScoped(
		Effect.gen(function* () {
			yield* start;

			return Stream.async<EmailMessage, Error>((emit) => {
				const searchFilter = options.searchFilter || ["UNSEEN"];

				const parseUnread = () => {
					imap?.search(searchFilter, (err: Error, results) => {
						if (err) {
							emit(Effect.fail(Option.some(err)));
							return;
						}

						if (results.length === 0) {
							return;
						}

						for (const result of results) {
							const f = imap?.fetch(result, {
								bodies: "",
								markSeen: options.markSeen || false,
							});

							f?.on("message", (message: ImapMessage, seqno: number) => {
								let attributes: ImapMessageAttributes;
								let data = "";

								message.on("body", (stream: NodeJS.ReadableStream) => {
									stream.on("data", (chunk) => {
										data += chunk.toString("UTF-8");
									});

									stream.once("end", () => {
										simpleParser(
											data,
											(err: Error | undefined, mail: TParsedMail) => {
												if (err) {
													emit(Effect.fail(Option.some(err)));
													return;
												}

												emit(
													Effect.succeed(
														Chunk.of({
															mail,
															sequenceNumber: seqno,
															attributes,
														}),
													),
												);
											},
										);
									});
								});

								message.on("attributes", (attrs) => {
									attributes = attrs;
								});
							});

							f?.once("error", (error) => {
								emit(Effect.fail(Option.some(error)));
							});
						}
					});
				};

				// Initial fetch if configured
				if (fetchUnreadOnStart) {
					parseUnread();
				}

				// Listen for new mail
				const onMail = () => parseUnread();
				const onUpdate = () => parseUnread();
				const onError = (err: Error) => emit(Effect.fail(Option.some(err)));

				imap?.on("mail", onMail);
				imap?.on("update", onUpdate);
				imap?.on("error", onError);

				// Cleanup function
				return Effect.sync(() => {
					if (imap) {
						imap.removeListener("mail", onMail);
						imap.removeListener("update", onUpdate);
						imap.removeListener("error", onError);
					}
				});
			});
		}),
	);

	return { messages, start, stop };
};

// Layer to provide the service
export const EmailListenerLive = (options: MailOptions) =>
	Layer.succeed(EmailListener, makeEmailListener(options));

// Convenience function to create email stream
export const emailStream = (options: MailOptions) =>
	makeEmailListener(options).messages;
