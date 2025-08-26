import type { Config } from "imap";
import type { ParsedMail } from "mailparser";

declare module "bun" {
	interface Env {
		EMAIL_ADDRESS: string;
		EMAIL_PASSWORD: string;
		IMAP_SERVER: string;
		IMAP_PORT: number;
	}
}

export type TSearchCriteria =
	| "ALL"
	| "ANSWERED"
	| "DELETED"
	| "DRAFT"
	| "FLAGGED"
	| "NEW"
	| "SEEN"
	| "RECENT"
	| "OLD"
	| "UNANSWERED"
	| "UNDELETED"
	| "UNDRAFT"
	| "UNFLAGGED"
	| "UNSEEN"
	| ["FROM", string]
	| ["TO", string]
	| ["CC", string]
	| ["BCC", string]
	| ["SUBJECT", string]
	| ["BODY", string]
	| ["TEXT", string]
	| ["BEFORE", string | Date]
	| ["ON", string | Date]
	| ["SINCE", string | Date]
	| ["SENTBEFORE", string | Date]
	| ["SENTON", string | Date]
	| ["SENTSINCE", string | Date]
	| ["HEADER", string, string]
	| ["LARGER", number]
	| ["SMALLER", number]
	| ["UID", string | number]
	| ["X-GM-RAW", string]
	| ["X-GM-THRID", string | number]
	| ["X-GM-MSGID", string | number]
	| ["X-GM-LABELS", string]
	| TSearchCriteria[];

export type TParsedMail = ParsedMail;

export type MailOptions = {
	markSeen?: boolean;
	mailbox?: string;
	searchFilter?: TSearchCriteria[];
	fetchUnreadOnStart?: boolean;
} & Config;
