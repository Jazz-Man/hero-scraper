import CircuitStatus from "./CircuitStatus.ts";
import { ProtocolError } from "./ProtocolError.ts";
import type ProtocolReply from "./ProtocolReply.ts";
import RouterDescriptor from "./RouterDescriptor.ts";

interface AddrMap {
	ADDRESS: string;
	NEWADDRESS: string;
	EXPIRY: string;
	[key: string]: any;
}

export type TProtocolInfo = {
	methods: string[];
	cookiefile: string | null;
	version: string;
};

export type RouterDescriptorMap = Map<string, RouterDescriptor>;

export default class Parser {
	private descriptorReplyLines: Record<string, string> = {
		router: "_parseRouter",
		platform: "_parsePlatform",
		published: "_parsePublished",
		fingerprint: "_parseFingerprint",
		hibernating: "_parseHibernating",
		uptime: "_parseUptime",
		"overload-general": "_parseOverloadGeneral",
		"onion-key": "_parseOnionKey",
		"ntor-onion-key": "_parseNtorOnionKey",
		"signing-key": "_parseSigningKey",
		accept: "_parseAccept",
		reject: "_parseReject",
		"ipv6-policy": "_parseIPv6Policy",
		"router-signature": "_parseRouterSignature",
		contact: "_parseContact",
		family: "_parseFamily",
		"caches-extra-info": "_parseCachesExtraInfo",
		"extra-info-digest": "_parseExtraInfoDigest",
		"hidden-service-dir": "_parseHiddenServiceDir",
		bandwidth: "_parseBandwidth",
		protocols: "_parseProtocols",
		"allow-single-hop-exits": "_parseAllowSingleHopExits",
		"or-address": "_parseORAddress",
		"master-key-ed25519": "_parseMasterKeyEd25519",
		"router-sig-ed25519": "_parseRouterSigEd25519",
		"identity-ed25519": "_parseIdentityEd25519",
		"onion-key-crosscert": "_parseOnionKeyCrosscert",
		"ntor-onion-key-crosscert": "_parseNtorOnionKeyCrosscert",
		"tunnelled-dir-server": "_parseTunnelledDirServer",
		proto: "_parseProtoVersions",
		a: "_parseALine",
		p: "_parseAccept",
		p6: "_parseIPv6Policy",
		id: "_parseIdLine",
	};

	public static base64ToHexString(base64: string): string {
		// Ensure base64 string is properly padded
		const padLength = base64.length % 4;
		if (padLength > 0) {
			base64 = base64.padEnd(base64.length + (4 - padLength), "=");
		}

		// Decode the base64 string to a binary string
		const binary = Buffer.from(base64, "base64");

		// Convert the binary string to a hexadecimal representation and make it uppercase
		return binary.toString("hex").toUpperCase();
	}

	private static parseRLine(line: string): Record<string, string> {
		const values = line.split(" ");

		return {
			nickname: values[1],
			fingerprint: this.base64ToHexString(values[2]).substring(0, 40),
			digest: this.base64ToHexString(values[3]).substring(0, 40),
			published: `${values[4]} ${values[5]}`,
			ip_address: values[6],
			or_port: values[7],
			dir_port: values[8],
		};
	}

	/**
	 * Parse a router descriptor or microdescriptor.
	 *
	 * @param reply - The reply to parse
	 * @returns Array of RouterDescriptor objects
	 */
	public parseDirectoryStatus(reply: ProtocolReply): RouterDescriptor[] {
		const descriptors: RouterDescriptor[] = [];
		let descriptor = new RouterDescriptor();
		let mds = false;

		if (
			reply.get(0)?.startsWith("onion-key") ||
			reply.get(1)?.startsWith("onion-key")
		) {
			mds = true; // parsing full microdescriptor list
		}

		while (reply.valid()) {
			const line = reply.current();

			if (/^200 OK/i.test(line)) {
				continue; // Skip HTTP "200 OK" responses
			}
			//
			if (line.trim() === "") {
				continue; // Skip empty lines
			}

			let isOptional = false;
			let currentLine = line;

			if (currentLine.startsWith("opt ")) {
				isOptional = true;
				currentLine = currentLine.slice(4);
			}

			const { keyword, value } = this.splitToKeywordValues(currentLine);

			if (keyword === "router" || (keyword === "onion-key" && mds)) {
				if (descriptor.fingerprint) {
					descriptors.push(descriptor);
				}
				descriptor = new RouterDescriptor();
			}

			if (this.descriptorReplyLines[keyword]) {
				const callback = this.descriptorReplyLines[keyword];
				const parsedValue = (this as any)[callback](value, reply);
				descriptor.setArray(parsedValue);
			} else if (!isOptional) {
				console.warn(`No callback found for keyword ${keyword}`);
			}

			reply.next();
		}

		if (descriptor.fingerprint) {
			descriptors.push(descriptor);
		} else if (Object.keys(descriptor).length > 0) {
			descriptors.push(descriptor);
		}

		return descriptors;
	}

	/**
	 * Parse a router descriptor or microdescriptor.
	 *
	 * @param reply - The reply to parse
	 * @returns Array of RouterDescriptor objects
	 */
	public parseMicrodescriptorStatus(reply: ProtocolReply): RouterDescriptorMap {
		const descriptors = new Map<string, RouterDescriptor>();
		let descriptor: RouterDescriptor | null = null;

		while (reply.valid()) {
			const line = reply.current().trim();

			if (/^200 OK/i.test(line)) {
				continue; // Skip HTTP "200 OK" responses
			}
			//
			if (line === "") {
				continue; // Skip empty lines
			}

			const { keyword, value } = this.splitToKeywordValues(line);
			let res: any;

			switch (keyword) {
				case "p":
					if (descriptor !== null) {
						res = this._parseIPPolicy(value);
						descriptor.setArray(res);
					}

					break;

				case "onion-key":
					if (descriptor !== null) {
						descriptors.set(descriptor.ed25519_key, descriptor);
					}

					descriptor = new RouterDescriptor();

					descriptor.setArray(this._parseOnionKey(value, reply));

					break;
				case "id":
					if (descriptor !== null) {
						descriptor.setArray(this._parseIdLine(value));
					}

					break;

				case "family":
					if (descriptor !== null) {
						descriptor.setArray(this._parseFamily(value));
					}

					break;
				case "ntor-onion-key":
					if (descriptor !== null) {
						descriptor.setArray(this._parseNtorOnionKey(value));
					}

					break;
				case "p6":
					if (descriptor !== null) {
						descriptor.setArray(this._parseIPv6Policy(value));
					}

					break;

				default:
					console.warn(`Unknown key: ${keyword} with value: ${value}`);
					break;
			}

			reply.next();
		}

		// Save the last parsed descriptor
		if (descriptor?.ed25519_key) {
			descriptors.set(descriptor.ed25519_key, descriptor);
		}

		return descriptors;
	}

	/**
	 * Parse a circuit status (CIRC) response.
	 *
	 * @param line A circuit status line (with or without /^CIRC/)
	 *
	 * @throws ProtocolError If status line or value is malformed
	 */
	public parseCircuitStatusLine(line: string): CircuitStatus {
		// Remove "CIRC " prefix if present
		if (/^\s*CIRC /.test(line)) {
			line = line.replace(/^\s*CIRC\s*/, "");
		}

		const parts = line.split(" ");

		if (parts.length < 3) {
			throw new Error(`Malformed circuit status line: "${line}"`);
		}

		const [id, status, path, ...rest] = parts;

		// Validate status
		const validStatuses = ["LAUNCHED", "BUILT", "EXTENDED", "FAILED", "CLOSED"];
		if (!validStatuses.includes(status)) {
			throw new Error(`Unknown circuit status: "${status}"`);
		}

		const details = rest.join(" ");

		const circuit = new CircuitStatus();

		circuit.id = Number.parseInt(id, 10);
		circuit.status = status;

		circuit.path = path?.split(",").map((hop) => {
			const [fingerprint, nickname] = hop.split("~");
			return [fingerprint, nickname] as [string, string];
		});

		// Parse key-value pairs in the remaining line
		const keyValueRegex = /(\w+)=([^ ]+)/g;
		let match: RegExpExecArray | null;

		while ((match = keyValueRegex.exec(details)) !== null) {
			const [_, key, value] = match;

			switch (key) {
				case "BUILD_FLAGS":
					circuit.buildFlags = value.split(",");
					break;
				case "PURPOSE":
					circuit.purpose = value;
					break;
				case "HS_STATE":
					circuit.hsState = value;
					break;
				case "REND_QUERY":
					circuit.rendQuery = value;
					break;
				case "TIME_CREATED":
					circuit.created = value;
					break;
				case "REASON":
					circuit.reason = value;
					break;
				case "REMOTE_REASON":
					circuit.remoteReason = value;
					break;
				case "SOCKS_USERNAME":
					circuit.socksUsername = value;
					break;
				case "SOCKS_PASSWORD":
					circuit.socksPassword = value;
					break;
				default:
					console.warn(`Unknown key encountered: ${key}`);
			}
		}

		return circuit;
	}

	public parseRouterStatus(reply: ProtocolReply): RouterDescriptorMap {
		const descriptors = new Map<string, RouterDescriptor>();

		let descriptor: RouterDescriptor | null = null;

		for (const line of reply.getReplyLines()) {
			if (line === "." || line === "250 OK") {
				continue; // Пропустити непотрібні рядки
			}

			const lineType = line[0];

			switch (lineType) {
				case "r":
					if (descriptor !== null) {
						descriptors.set(descriptor.fingerprint, descriptor);
					}
					descriptor = new RouterDescriptor();
					descriptor.setArray(this._parseRLine(line));
					break;

				case "a":
					if (descriptor !== null) {
						descriptor.setArray(this._parseALine(line));
					}
					break;

				case "s":
					if (descriptor !== null) {
						descriptor.setArray(this._parseSLine(line));
					}
					break;

				case "v":
					if (descriptor !== null) {
						descriptor.setArray(this._parsePlatform(line));
					}
					break;

				case "w":
					if (descriptor !== null) {
						descriptor.setArray(this._parseWLine(line));
					}
					break;

				case "p":
					if (descriptor !== null) {
						const pLine = this._parsePLine(line);
						descriptor.setArray(pLine);
					}
					break;

				default:
					// Додаткові дії для незнайомих рядків (наприклад, журналювання)
					console.warn(`UNKNOWN ROUTER STATUS LINE ${lineType}: `, line);
			}
		}

		// Додати останній дескриптор
		if (descriptor !== null) {
			descriptors.set(descriptor.fingerprint, descriptor);
		}

		return descriptors;
	}

	public _parseNtorOnionKeyCrosscert(
		line: string,
		reply: ProtocolReply,
	): {
		ntor_onion_key_crosscert_signbit: string;
		ntor_onion_key_crosscert: string;
	} {
		const signbit = line;
		const cert = this.parseBlockData(
			reply,
			"-----BEGIN ED25519 CERT-----",
			"-----END ED25519 CERT-----",
		);

		return {
			ntor_onion_key_crosscert_signbit: signbit,
			ntor_onion_key_crosscert: cert,
		};
	}

	public _parseTunnelledDirServer(line: string): {
		tunnelled_dir_server: boolean;
	} {
		return { tunnelled_dir_server: true };
	}

	public _parseIdLine(line: string): { ed25519_key?: string } {
		const ret: { ed25519_key?: string } = {};

		const { keyword, value } = this.splitToKeywordValues(line);

		if (keyword === "rsa1024") {
			// base64 encoded fingerprint - implementations should ignore
			// bin2hex(base64_decode($value)) == fingerprint
		} else if (keyword === "ed25519") {
			ret["ed25519_key"] = value;
		} // unknown key type - ignore

		return ret;
	}

	/**
	 * Parses the PROTOCOLINFO response from Tor control port.
	 * @param reply The ProtocolReply instance containing the response.
	 * @returns An object with methods, cookiefile, and version information.
	 * @throws Error if the response is malformed or missing required fields.
	 */
	public parseProtocolInfo(reply: ProtocolReply): TProtocolInfo {
		// Get individual lines from the reply
		const info = reply.get(0);
		const auth = reply.get(1);
		const versionLine = reply.get(2);

		if (!info || !auth || !versionLine) {
			throw new Error("Incomplete PROTOCOLINFO response");
		}

		const { keyword: pInfoKeyword, value: pInfoValue } =
			this.splitToKeywordValues(info);

		if (!pInfoKeyword.endsWith("PROTOCOLINFO")) {
			throw new Error(`Unexpected PROTOCOLINFO response; got "${info}"`);
		}
		if (!/^\d+$/.test(pInfoValue)) {
			throw new Error(
				`Invalid PROTOCOLINFO version. Expected 1*DIGIT; got "${pInfoValue}"`,
			);
		}

		const { keyword: authKeyword, value: authValue } =
			this.splitToKeywordValues(auth);

		if (!authKeyword.endsWith("AUTH")) {
			throw new Error(`Expected AUTH line; got "${auth}"`);
		}

		const authValues = this._parseDelimitedData(authValue);

		if (!authValues["METHODS"] || authValues["METHODS"].length === 0) {
			throw new Error(
				"PROTOCOLINFO reply did not contain any authentication methods",
			);
		}

		const methods = authValues["METHODS"];
		const cookiefile = authValues["COOKIEFILE"] || null;

		const { keyword: versionKeyword, value: versionValue } =
			this.splitToKeywordValues(versionLine);

		if (!versionKeyword.endsWith("VERSION")) {
			throw new Error(`Expected VERSION line; got "${versionLine}"`);
		}

		const versionValues = this._parseDelimitedData(versionValue);

		if (!versionValues["Tor"]) {
			throw new Error(
				"PROTOCOLINFO VERSION line did not match expected format",
			);
		}
		const version = versionValues["Tor"];

		return {
			methods: methods.split(","),
			cookiefile,
			version,
		};
	}

	/**
	 * Parse an ADDRMAP line.
	 *
	 * @param line The line to parse
	 * @throws ProtocolError If the line is malformed
	 */
	public parseAddrMap(line: string): AddrMap {
		if (!line.startsWith("ADDRMAP")) {
			throw new Error("Data passed to parseAddrMap must begin with ADDRMAP");
		}

		const regex = /^ADDRMAP ([^\s]+) ([^\s]+) (?:(NEVER|"[^"]+"))( .*)?$/;
		const match = line.match(regex);

		if (!match) {
			throw new ProtocolError(`Invalid ADDRMAP line '${line}'`);
		}

		const map: AddrMap = {
			ADDRESS: match[1],
			NEWADDRESS: match[2],
			EXPIRY: match[3].replace(/"/g, ""), // Remove quotes from expiry
		};

		// Parse any additional keyword arguments (assuming `parseKeywordArguments` is a method)
		if (match[4]) {
			const additionalArgs = this.parseKeywordArguments(match[4]);
			return { ...map, ...additionalArgs };
		}

		return map;
	}

	public parseKeywordArguments(input: string): { [key: string]: string } {
		const eventData: { [key: string]: string } = {};
		let offset = 0;

		while (offset < input.length) {
			if (input[offset] === " ") {
				++offset;
				continue;
			}

			let value: string | null = null;
			const temp = input.slice(offset);
			const keyword = this.parseAlpha(temp);

			offset += keyword.length;

			if (input[offset] !== "=") {
				throw new Error(
					`Expected "=" at offset ${offset}, got ${input[offset]}`,
				);
			}

			++offset;

			const tempValue = input.slice(offset);

			if (tempValue === "") {
				// empty value, end of line
				value = "";
			} else if (input[offset] === " ") {
				// empty value, more keywords remain
				value = "";
				++offset;
			} else if (input[offset] === '"') {
				value = this.parseQuotedString(tempValue);
				offset += value.length + 3;
			} else {
				value = this.parseNonSpDquote(tempValue);
				offset += value.length + 1;
			}

			eventData[keyword] = value;
		}

		return eventData;
	}

	public parseAlpha(input: string): string {
		const match = input.match(/([a-zA-Z_]{1,})/);

		if (match) {
			return match[1];
		}

		throw new Error("Illegal keyword format");
	}

	public parseQuotedString(input: string): string {
		const len = input.length;
		let val = "";
		let terminated = false;

		for (let i = 1; i < len; ++i) {
			const c = input[i];

			if (c === '"') {
				if (val.length > 1 && val[val.length - 1] !== "\\") {
					terminated = true;
					break;
				}
			}

			if (/[\x01-\x08\x0b\x0c\x0e-\x7f]/.test(c)) {
				val += c;
			}
		}

		if (!terminated) {
			throw new Error("Unterminated quote string encountered");
		}

		return val;
	}

	public parseNonSpDquote(input: string): string {
		const regex =
			/^([\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]+)(?:\s|$)/;
		const match = input.match(regex);

		if (match) {
			return match[1];
		}

		throw new Error(`Illegal keyword argument string encountered: ${input}`);
	}

	public parseDelimitedData(
		data: string,
		prefix: string | null = null,
		delimiter = "=",
		boundary = " ",
	): { [key: string]: string } {
		return this._parseDelimitedData(data, prefix, delimiter, boundary);
	}

	public splitToKeywordValues(
		line: string,
	): Record<"keyword" | "value", string> {
		const [keyword, ...rest] = line.split(/\s+/);
		const value = rest.join(" ");

		return { keyword, value };
	}

	private _parseRouter(line: string): {
		nickname: string;
		ip_address: string;
		or_port: string;
		dir_port: string;
	} {
		const values = line.split(" ");

		if (values.length < 5) {
			throw new Error(
				`Error parsing router line. Expected 5 values, got ${values.length}`,
			);
		}

		const [nickname, ip_address, or_port, dir_port, ...rest] = values;

		return {
			nickname,
			ip_address,
			or_port,
			dir_port,
		};
	}

	private _parsePlatform(line: string): { platform: string } {
		return { platform: line };
	}

	private _parsePublished(line: string): { published: string } {
		const values = line.split(" ");

		if (values.length !== 2) {
			throw new Error(
				`Error parsing published line. Expected 2 values, got ${values.length}`,
			);
		}

		const date = values[0]; // You may wish to validate the date format
		const time = values[1]; // You may wish to validate the time format

		// TODO: validate date and time format if needed

		return {
			published: line,
		};
	}

	private _parseFingerprint(line: string): { fingerprint: string } {
		return {
			fingerprint: line.replace(/\s+/g, ""),
		};
	}

	private _parseHibernating(line: string): { hibernating: string } {
		return {
			hibernating: line,
		};
	}

	private _parseUptime(line: string): { uptime: string } {
		if (!/^\d+$/.test(line)) {
			throw new Error("Invalid uptime, expected numeric value");
		}

		return {
			uptime: line,
		};
	}

	private _parseOverloadGeneral(line: string): { overload_general: boolean } {
		return {
			overload_general: true,
		};
	}

	private _parseOnionKey(
		line: string,
		reply: ProtocolReply,
	): { onion_key: string } {
		const key = this.parseRsaKey(reply);
		return {
			onion_key: key,
		};
	}

	private _parseNtorOnionKey(line: string): { ntor_onion_key: string } {
		const len = line.length % 4;
		if (len > 0) {
			line = line.padEnd(line.length + (4 - len), "=");
		}

		if (!this.isBase64(line)) {
			throw new Error(
				"ntor-onion-key did not contain valid base64 encoded data",
			);
		}

		return {
			ntor_onion_key: line,
		};
	}

	// Helper method to check if a string is valid base64
	private isBase64(str: string): boolean {
		try {
			const decoded = Buffer.from(str, "base64").toString("utf-8");
		} catch {
			return false;
		}

		return true;
	}

	private _parseSigningKey(
		line: string,
		reply: ProtocolReply,
	): { signing_key: string } {
		const key = this.parseRsaKey(reply);
		return {
			signing_key: key,
		};
	}

	// Helper method to decode base64
	private base64Decode(encoded: string): string | null {
		try {
			return Buffer.from(encoded, "base64").toString("utf-8");
		} catch {
			return null;
		}
	}

	private parseRsaKey(reply: ProtocolReply): string {
		return this.parseBlockData(
			reply,
			"-----BEGIN RSA PUBLIC KEY-----",
			"-----END RSA PUBLIC KEY-----",
		);
	}

	private _parseAccept(line: string): { exit_policy4: { accept: string } } {
		return {
			exit_policy4: { accept: line },
		};
	}

	private _parseReject(line: string): { exit_policy4: { reject: string } } {
		return {
			exit_policy4: { reject: line },
		};
	}

	private _parseIPv6Policy(line: string): {
		exit_policy6: { [key: string]: string[] };
	} {
		return {
			exit_policy6: this._parsePolicy(line),
		};
	}

	private _parseIPPolicy(line: string): {
		exit_policy4: { [key: string]: string[] };
	} {
		return {
			exit_policy4: this._parsePolicy(line),
		};
	}

	private _parsePolicy(line: string) {
		const [policy, portlist] = line.split(" ");
		const ports = portlist.split(",");

		const p: { [key: string]: string[] } = { [policy]: ports };

		if (p["reject"]) {
			p["accept"] = ["*:*"];
		} else {
			p["reject"] = ["*:*"];
		}
		return p;
	}

	private _parseRouterSignature(
		line: string,
		reply: ProtocolReply,
	): { router_signature: string } {
		const key = this.parseBlockData(
			reply,
			"-----BEGIN SIGNATURE-----",
			"-----END SIGNATURE-----",
		);
		return {
			router_signature: key,
		};
	}

	private _parseContact(line: string): { contact: string } {
		return { contact: line };
	}

	private _parseFamily(line: string): { family: string[] } {
		return {
			family: line.split(" "),
		};
	}

	private _parseCachesExtraInfo(line: string): { caches_extra_info: boolean } {
		// presence of this field indicates the server caches extra info
		return { caches_extra_info: true };
	}

	private _parseExtraInfoDigest(line: string): { extra_info_digest: string } {
		return { extra_info_digest: line };
	}

	private _parseHiddenServiceDir(line: string): { hidden_service_dir: string } {
		if (!line || line.trim() === "") {
			line = "2";
		}
		return {
			hidden_service_dir: line,
		};
	}

	private _parseBandwidth(line: string): {
		bandwidth_average: string;
		bandwidth_burst: string;
		bandwidth_observed: string;
	} {
		const values = line.split(" ");

		if (values.length < 3) {
			throw new Error(
				`Error parsing bandwidth line. Expected 3 values, got ${values.length}`,
			);
		}

		const [bandwidth_average, bandwidth_burst, bandwidth_observed] = values;

		return { bandwidth_average, bandwidth_burst, bandwidth_observed };
	}

	private _parseProtocols(line: string): { protocols: string } {
		return {
			protocols: line,
		};
	}

	private _parseProtoVersions(line: string): {
		proto: Record<string, number[]>;
	} {
		const protos: Record<string, number[]> = {};

		// Обробка рядка, схожого на:
		// proto Cons=1-2 Desc=1-2 DirCache=1 HSDir=1 HSIntro=3 HSRend=1-2 Link=1-4 LinkAuth=1 Microdesc=1-2 Relay=1-2
		// але також може містити значення на зразок "Something=3,5-6"

		const keyValueRegex = /(\w+)=([^ ]+)/g;
		let match: RegExpExecArray | null;

		while ((match = keyValueRegex.exec(line)) !== null) {
			const [_, keyword, values] = match;
			protos[keyword] = [];

			const valueList = values.split(",");

			valueList.forEach((value) => {
				if (value.includes("-")) {
					const range = value.split("-").map(Number);
					const [start, end] = range;

					if (start < end) {
						// Додаємо діапазон значень
						protos[keyword].push(
							...Array.from({ length: end - start + 1 }, (_, i) => start + i),
						);
					}
				} else {
					protos[keyword].push(Number(value));
				}
			});
		}

		return { proto: protos };
	}

	private _parseAllowSingleHopExits(line: string): {
		allow_single_hop_exits: boolean;
	} {
		// Наявність цієї лінії вказує на те, що маршрутизатор дозволяє однохопові виходи
		return { allow_single_hop_exits: true };
	}

	private _parseORAddress(line: string): { or_address: string } {
		return { or_address: line };
	}

	private _parseMasterKeyEd25519(line: string): { ed25519_key: string } {
		return { ed25519_key: line };
	}

	private _parseRouterSigEd25519(line: string): { ed25519_sig: string } {
		return {
			ed25519_sig: line,
		};
	}

	private _parseIdentityEd25519(
		line: string,
		reply: ProtocolReply,
	): { ed25519_identity: string } {
		const cert = this.parseBlockData(
			reply,
			"-----BEGIN ED25519 CERT-----",
			"-----END ED25519 CERT-----",
		);
		return {
			ed25519_identity: cert,
		};
	}

	private _parseOnionKeyCrosscert(
		line: string,
		reply: ProtocolReply,
	): { onion_key_crosscert: string } {
		const cert = this.parseBlockData(
			reply,
			"-----BEGIN CROSSCERT-----",
			"-----END CROSSCERT-----",
		);
		return {
			onion_key_crosscert: cert,
		};
	}

	private parseBlockData(
		reply: ProtocolReply,
		startDelimiter: string,
		endDelimiter: string,
	): string {
		// Move to the next item in the iterator
		reply.next();

		let line = reply.current();

		// Check if the line starts with the startDelimiter
		if (line !== startDelimiter) {
			throw new Error(
				`Expected line beginning with "${startDelimiter}", got ${line}`,
			);
		}

		let data = line;

		// Continue reading until we find the endDelimiter
		while (reply.valid()) {
			reply.next();

			if (!reply.valid()) {
				throw new Error(
					`Reached end of reply without matching end delimiter "${endDelimiter}"`,
				);
			}

			line = reply.current();
			data += `\n${line}`;

			if (line === endDelimiter) {
				break;
			}
		}

		return data;
	}

	private _parseRLine(line: string): { [key: string]: string } {
		const values = line.split(" ");

		return {
			nickname: values[1],
			fingerprint: Parser.base64ToHexString(values[2]).slice(0, 40),
			digest: Parser.base64ToHexString(values[3]).slice(0, 40),
			published: `${values[4]} ${values[5]}`,
			ip_address: values[6],
			or_port: values[7],
			dir_port: values[8],
		};
	}

	private _parseALine(line: string): { or_port: string; ipv6_address: string } {
		// Check if the line contains a space and process accordingly
		if (line.includes(" ")) {
			const values = line.split(" ", 2);
			line = values[1];
		}

		let ip: string;
		let port: string;

		// Match IPv6 address with port or split by colon for standard cases
		const match = line.match(/\[([^\]]+)\]+:(\d+)/);
		if (match) {
			ip = match[1];
			port = match[2];
		} else {
			[ip, port] = line.split(":", 2);
		}

		// Return the parsed data as an object
		return {
			// or_port: null,
			or_port: port,
			// ipv6_address: null,
			ipv6_address: ip,
		};
	}

	private _parseSLine(line: string): { flags: string[] } {
		// Split the input line into parts based on spaces
		const values = line.split(" ");

		// Remove the first item from the array (e.g., the prefix 's')
		values.shift();

		// Return the remaining parts as an array of flags
		return {
			flags: values,
		};
	}

	private _parsePLine(line: string): Record<string, Record<string, string>> {
		const values = line.split(" ");

		if (values.length < 3) {
			throw new Error(`Invalid P-line format: ${line}`);
		}

		return {
			exit_policy4: {
				[values[1]]: values[2],
			},
		};
	}

	private _parseWLine(line: string): {
		bandwidth: string;
		bandwidth_measured: string | null;
		bandwidth_unmeasured: string | null;
	} {
		const bandwidth = this._parseDelimitedData(line, "w");

		if (!bandwidth["Bandwidth"]) {
			throw new Error("Bandwidth value not present in 'w' line");
		}

		return {
			bandwidth: bandwidth["Bandwidth"],
			bandwidth_measured: bandwidth["Measured"] || null,
			bandwidth_unmeasured: bandwidth["Unmeasured"] || null,
		};
	}

	private _parseDelimitedData(
		data: string,
		prefix: string | null = null,
		delimiter = "=",
		boundary = " ",
	): Record<string, string> {
		const result: Record<string, string> = {};

		// Remove the prefix if provided and matches
		if (prefix && typeof prefix === "string") {
			const prefixRegex = new RegExp(`^${this._escapeRegExp(prefix)} `);
			data = data.replace(prefixRegex, "");
		}

		let item = "";
		let value = "";
		let state: "i" | "d" | "dr" | "n" = "i";
		let quoted = false;

		const length = data.length;

		for (let p = 0; p < length; ++p) {
			const c = data[p];
			const eof = p + 1 >= length;

			switch (state) {
				case "i": // Parsing item name
					if (c === delimiter) {
						state = "d";
					} else {
						item += c;
					}
					break;

				case "d": // Parsing delimiter
					if (c === '"') {
						quoted = true;
						state = "dr";
					} else {
						value += c;
						quoted = false;
						state = "dr";
					}
					break;

				case "dr": // Parsing value
					if ((!quoted && c === boundary) || (quoted && c === '"')) {
						state = "n";
					} else {
						value += c;
					}
					break;

				case "n": // New key-value pair
					result[item] = value;
					item = "";
					value = "";
					state = "i";
					quoted = false;
					break;
			}

			// Handle EOF
			if (eof) {
				if (state === "dr" && quoted) {
					throw new Error(
						"EOF encountered while parsing quoted value in delimited data",
					);
				}
				result[item] = value;
			}
		}

		return result;
	}

	// Helper function to escape special characters in regex
	private _escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
}
