import type { ITCPClient } from "./interface.ts";
import { Readable } from "stream";
import readline from "node:readline";
import ProtocolReply from "./lib/ProtocolReply.ts";
import { ProtocolError } from "./lib/ProtocolError.ts";
import type RouterDescriptor from "./lib/RouterDescriptor.ts";
import Parser, {
  type TProtocolInfo,
  type TRouterStatus,
} from "./lib/Parser.ts";
import CircuitStatus from "./lib/CircuitStatus.ts";

export class TorClient {
  // GETINFO Constants
  public static readonly GETINFO_VERSION = "version";
  public static readonly GETINFO_VERSION_CURRENT = "status/version/current";
  public static readonly GETINFO_VERSION_RECOMMENDED =
    "status/version/recommended";
  public static readonly GETINFO_INFO_NAMES = "info/names";
  public static readonly GETINFO_CONFIG_DEFAULTS = "config/defaults";
  public static readonly GETINFO_CFGFILE = "config-file";
  public static readonly GETINFO_DESCRIPTOR_ALL = "desc/all-recent";
  public static readonly GETINFO_UDECRIPTOR_ALL = "md/all";
  public static readonly GETINFO_DORMANT = "dormant";
  public static readonly GETINFO_NETSTATUS_ALL = "ns/all";
  public static readonly GETINFO_DIRSTATUS_ALL = "dir/server/all";
  public static readonly GETINFO_ADDRESS = "address";
  public static readonly GETINFO_FINGERPRINT = "fingerprint";
  public static readonly GETINFO_TRAFFICREAD = "traffic/read";
  public static readonly GETINFO_TRAFFICWRITTEN = "traffic/written";
  public static readonly GETINFO_ENTRY_GUARDS = "entry-guards";
  public static readonly GETINFO_CONFIGNAMES = "config/names";
  public static readonly GETINFO_CONFIGTEXT = "config-text";
  public static readonly GETINFO_CIRCUITSTATUS = "circuit-status";
  public static readonly GETINFO_CURTIME_LOCAL = "current-time/local";
  public static readonly GETINFO_CURTIME_UTC = "current-time/utc";
  public static readonly GETINFO_UPTIME = "uptime";
  public static readonly GETINFO_STATUS_ORPORT = "net/listeners/or";
  public static readonly GETINFO_STATUS_DIRPORT = "net/listeners/dir";
  public static readonly GETINFO_STATUS_SOCKSPORT = "net/listeners/socks";
  public static readonly GETINFO_STATUS_TRANSPORT = "net/listeners/trans";
  public static readonly GETINFO_STATUS_NATDPORT = "net/listeners/natd";
  public static readonly GETINFO_STATUS_DNSPORT = "net/listeners/dns";
  public static readonly GETINFO_STATUS_CONTROLPORT = "net/listeners/control";
  public static readonly GETINFO_STATUS_EXTORPORT = "net/listeners/extor";
  public static readonly GETINFO_STATUS_HTTPTUNPORT =
    "net/listeners/httptunnel";
  // SIGNAL Constants
  public static readonly SIGNAL_RELOAD = "RELOAD";
  public static readonly SIGNAL_SHUTDOWN = "SHUTDOWN";
  public static readonly SIGNAL_DUMP = "DUMP";
  public static readonly SIGNAL_DEBUG = "DEBUG";
  public static readonly SIGNAL_HALT = "HALT";
  public static readonly SIGNAL_NEWNYM = "NEWNYM";
  public static readonly SIGNAL_CLEARDNSCACHE = "CLEARDNSCACHE";
  public static readonly SIGNAL_HEARTBEAT = "HEARTBEAT";
  public static readonly SIGNAL_ACTIVE = "ACTIVE";
  public static readonly SIGNAL_DORMANT = "DORMANT";
  // Hidden Service Key Types
  public static readonly ONION_KEYTYPE_NEW = "NEW";
  public static readonly ONION_KEYTYPE_RSA1024 = "RSA1024";
  public static readonly ONION_KEYTYPE_CURVE25519 = "ED25519-V3";
  public static readonly ONION_KEYBLOB_BEST = "BEST";
  // Hidden Service Flags
  public static readonly ONION_FLAG_DISCARDPK = 0x01;
  public static readonly ONION_FLAG_DETACH = 0x02;
  public static readonly ONION_FLAG_BASICAUTH = 0x04;
  public static readonly ONION_FLAG_NONANON = 0x08;
  // Authentication Constants
  public static readonly AUTH_SAFECOOKIE_SERVER_TO_CONTROLLER =
    "Tor safe cookie authentication server-to-controller hash";
  public static readonly AUTH_SAFECOOKIE_CONTROLLER_TO_SERVER =
    "Tor safe cookie authentication controller-to-server hash";
  private tcpClient: ITCPClient;
  private parser: Parser;

  constructor(tcpClient: ITCPClient) {
    this.tcpClient = tcpClient;
    this.parser = new Parser();
  }

  public static readonly GETINFO_DESCRIPTOR_ID = (id: string): string =>
    `desc/id/${id}`;

  public static readonly GETINFO_DESCRIPTOR_NAME = (name: string): string =>
    `desc/name/${name}`;

  public static readonly GETINFO_UDESCRIPTOR_ID = (id: string): string =>
    `md/id/${id}`;

  public static readonly GETINFO_UDESCRIPTOR_NAME = (name: string): string =>
    `md/name/${name}`;

  public static readonly GETINFO_NETSTATUS_ID = (id: string): string =>
    `ns/id/${id}`;

  public static readonly GETINFO_NETSTATUS_NAME = (name: string): string =>
    `ns/name/${name}`;

  public static readonly GETINFO_IP2COUNTRY = (ip: string): string =>
    `ip-to-country/${ip}`;

  async connect(host: string, port: number): Promise<any> {
    await this.tcpClient.connect(host, port);
  }

  async authenticate(password?: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const buf = await this.sendCommand(`AUTHENTICATE "${password}"`);

      const response = buf.toString();

      if (!response.startsWith("250")) {
        reject(`Authentication failed: ${response}`);
      }

      resolve(response);
    });
  }

  async getProtocolInfo(): Promise<TProtocolInfo> {
    return new Promise(async (resolve, reject) => {
      const response = await this.sendCommand("PROTOCOLINFO 1");

      const reply = await this.handleResponse(response, "PROTOCOLINFO");

      try {
        const info = this.parser.parseProtocolInfo(reply);
        resolve(info);
      } catch (e) {
        reject(e);
      }
    });
  }

  async sendCommand(command: string): Promise<Buffer> {
    return await this.tcpClient.send(command);
  }

  close(): void {
    this.tcpClient.close();
  }

  async getInfo(command: string): Promise<ProtocolReply> {
    const response = await this.sendCommand(`GETINFO ${command}`);

    const reply = await this.handleResponse(response, command);

    return new Promise(async (resolve, reject) => {
      if (!reply.isPositiveReply()) {
        reject(reply.get(0));
      }
      resolve(reply);
    });
  }

  /**
   * Return the best guess of Tor's external IP address.
   *
   * @returns Tor's external IP address
   *
   * @throws ProtocolError If address could not be determined
   */
  async getInfoAddress(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_ADDRESS);
  }

  async getInfoNames(): Promise<Record<string, string>> {
    const reply = await this.getInfo(TorClient.GETINFO_INFO_NAMES);

    return new Promise(async (resolve, reject) => {
      const info: Record<string, string> = {};

      for (const line of reply.getReplyLines()) {
        const [key, value] = line.split("--", 2);

        info[key.trim()] = value.trim();
      }

      resolve(info);
    });
  }

  async getConfigDefaults(): Promise<Record<string, string>> {
    const reply = await this.getInfo(TorClient.GETINFO_CONFIG_DEFAULTS);

    return new Promise(async (resolve, reject) => {
      const info: Record<string, string> = {};

      for (const line of reply.getReplyLines()) {
        const [key, value] = line.split(/\s+/, 2);

        info[key.trim()] = value.trim().split('"').filter(Boolean).join(" ");
      }

      resolve(info);
    });
  }

  async getInfoIpToCountry(ip: string): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_IP2COUNTRY(ip));
  }

  async getInfoFingerprint(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_FINGERPRINT);
  }

  async getInfoUptime(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_UPTIME);
  }

  async getInfoCurrentTime(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_CURTIME_UTC);
  }

  async getInfoCurrentLocalTime(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_CURTIME_LOCAL);
  }

  async getVersion(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_VERSION);
  }

  async getInfoStatusVersionCurrent(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_VERSION_CURRENT);
  }

  async getInfoTrafficRead(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_TRAFFICREAD);
  }

  async getInfoTrafficWritten(): Promise<string> {
    return this.getInfoInternalOneLine(TorClient.GETINFO_TRAFFICWRITTEN);
  }

  async getInfoConfigText(): Promise<string> {
    const reply = await this.getInfo(TorClient.GETINFO_CONFIGTEXT);

    return new Promise((resolve, reject) => {
      let config = "";

      for (const line of reply.getReplyLines()) {
        const parts = line.split(" ", 2);
        config += parts[0];

        if (parts[1]) {
          config += " " + parts[1];
        }
        config += "\n";
      }

      resolve(config);
    });
  }

  async getInfoStatusVersionRecommended(): Promise<string[]> {
    const stringPromise = await this.getInfoInternalOneLine(
      TorClient.GETINFO_VERSION_RECOMMENDED,
    );

    return new Promise((resolve, reject) => {
      resolve(stringPromise.split(","));
    });
  }

  /**
   * The latest server descriptor for a given OR.
   * NOTE: Modern Tor clients do not download server descriptors by default.
   * If you get an exception "unrecognized key desc/*", use microdescriptors instead.
   *
   * @param descriptorNameOrID - If null, get info on ALL descriptors. Otherwise, fetch based on the fingerprint or nickname.
   * @returns A single RouterDescriptor object or an array of RouterDescriptor objects
   * @throws Error If descriptorNameOrID is invalid
   * @throws ProtocolError If no descriptor was found or another protocol error occurred
   */
  async getInfoDescriptor(
    descriptorNameOrID: string | null = null,
  ): Promise<RouterDescriptor | RouterDescriptor[]> {
    let cmd: string;

    if (descriptorNameOrID === null) {
      cmd = TorClient.GETINFO_DESCRIPTOR_ALL;
    } else if (this.isFingerprint(descriptorNameOrID)) {
      cmd = TorClient.GETINFO_DESCRIPTOR_ID(descriptorNameOrID);
    } else if (this.isNickname(descriptorNameOrID)) {
      cmd = TorClient.GETINFO_DESCRIPTOR_NAME(descriptorNameOrID);
    } else {
      throw new ProtocolError(
        `"${descriptorNameOrID}" is not a valid descriptor fingerprint or nickname`,
      );
    }

    const reply = await this.getInfo(cmd);

    return new Promise((resolve) => {
      const descriptors = this.parser.parseDirectoryStatus(reply);

      resolve(descriptors);
    });
  }

  async getInfoDirectoryStatus<T extends string | null>(
    descriptorNameOrID: T = null,
  ): Promise<TRouterStatus<T>> {
    let cmd: string;

    if (descriptorNameOrID === null) {
      cmd = TorClient.GETINFO_NETSTATUS_ALL;
    } else if (this.isFingerprint(descriptorNameOrID)) {
      cmd = TorClient.GETINFO_NETSTATUS_ID(descriptorNameOrID);
    } else if (this.isNickname(descriptorNameOrID)) {
      cmd = TorClient.GETINFO_NETSTATUS_NAME(descriptorNameOrID);
    } else {
      throw new ProtocolError(
        `"${descriptorNameOrID}" is not a valid router fingerprint or nickname`,
      );
    }

    const reply = await this.getInfo(cmd);

    return new Promise((resolve) => {
      const descriptors: TRouterStatus<T> =
        this.parser.parseRouterStatus<T>(reply);

      if (descriptorNameOrID !== null) {
        resolve(Object.values(descriptors).at(0) as TRouterStatus<T>);
      }

      resolve(descriptors as TRouterStatus<T>);
    });
  }

  async getInfoMicroDescriptor<T extends string | null>(
    descriptorNameOrID: T = null,
  ): Promise<TRouterStatus<T>> {
    let cmd: string;

    if (descriptorNameOrID === null) {
      cmd = TorClient.GETINFO_UDECRIPTOR_ALL;
    } else if (this.isFingerprint(descriptorNameOrID)) {
      cmd = TorClient.GETINFO_UDESCRIPTOR_ID(descriptorNameOrID);
    } else if (this.isNickname(descriptorNameOrID)) {
      cmd = TorClient.GETINFO_UDESCRIPTOR_NAME(descriptorNameOrID);
    } else {
      throw new ProtocolError(
        `"${descriptorNameOrID}" is not a valid router fingerprint or nickname`,
      );
    }

    const reply = await this.getInfo(cmd);

    return new Promise((resolve) => {
      const descriptors = this.parser.parseMicrodescriptorStatus<T>(reply);

      if (descriptorNameOrID !== null) {
        resolve(Object.values(descriptors).at(0) as TRouterStatus<T>);
      }

      resolve(descriptors);
    });
  }

  async getInfoCircuitStatus(): Promise<CircuitStatus[]> {
    const reply = await this.getInfo(TorClient.GETINFO_CIRCUITSTATUS);

    return new Promise((resolve, reject) => {
      const circuits: CircuitStatus[] = [];

      reply.getReplyLines().forEach((line) => {
        if (line === "250 OK") {
          return;
        }
        circuits.push(this.parser.parseCircuitStatusLine(line));
      });

      resolve(circuits);
    });
  }

  async getListeners(): Promise<Record<string, string | null>> {
    return new Promise(async (resolve, reject) => {
      const ports: Record<string, string | null> = {
        or: TorClient.GETINFO_STATUS_ORPORT,
        dir: TorClient.GETINFO_STATUS_DIRPORT,
        socks: TorClient.GETINFO_STATUS_SOCKSPORT,
        trans: TorClient.GETINFO_STATUS_TRANSPORT,
        natd: TorClient.GETINFO_STATUS_NATDPORT,
        dns: TorClient.GETINFO_STATUS_DNSPORT,
        extorport: TorClient.GETINFO_STATUS_EXTORPORT,
        httptunport: TorClient.GETINFO_STATUS_HTTPTUNPORT,
      };

      for (const which in ports) {
        const portCommand = ports[which];
        try {
          const response = await this.getInfo(portCommand);

          if (response.isPositiveReply()) {
            const line = response.get(0);

            const match = /"([^"]+)"/.exec(line);
            if (match) {
              ports[which] = match[1];
            } else {
              ports[which] = null;
            }
          } else {
            ports[which] = null;
          }
        } catch (ex) {
          ports[which] = null;
        }
      }

      resolve(ports);
    });
  }

  async getConf(keywords: string): Promise<ProtocolReply> {
    const response = await this.sendCommand(`GETCONF ${keywords}\r\n`);
    const reply = await this.handleResponse(response, "GETCONF");

    return new Promise(async (resolve, reject) => {
      // if (!reply.isPositiveReply()) {
      //   reject(reply.get(0));
      // }

      resolve(reply);
    });
  }

  /**
   * Check if a string is a valid fingerprint.
   *
   * @param string The string to check as a fingerprint
   *
   * @returns true if valid fingerprint
   */
  protected isFingerprint(string: string): boolean {
    return /^[A-F0-9]{40}$/i.test(string);
  }

  /**
   * Check if a string is a valid nickname. Router nicknames are 1-19
   * alphanumeric characters.
   *
   * @param string The string to check as a nickname
   *
   * @returns true if valid nickname
   */
  protected isNickname(string: string): boolean {
    return /^[A-Z0-9]{1,19}$/i.test(string);
  }

  public async getInfoInternalOneLine(command: string): Promise<string> {
    const reply = await this.getInfo(command);

    return new Promise((resolve) => {
      resolve(reply.get(0));
    });
  }

  private getLineReader(response: Buffer): readline.Interface {
    const stream = Readable.from(response, {
      encoding: "utf-8",
    });

    return readline.createInterface({
      input: stream,
      output: process.stdout,
      terminal: false,
    });
  }

  private async handleResponse(
    response: Buffer,
    command?: string,
  ): Promise<ProtocolReply> {
    const lineReader = this.getLineReader(response);

    const reply = new ProtocolReply(command);
    let evreply = new ProtocolReply();

    let first = false;
    let dataReply = false;
    let handlingEvent = false;

    for await (const line of lineReader) {
      if (line.trim() === ".") {
        break;
      }

      if (this.isEventReplyLine(line)) {
        handlingEvent = true;
        evreply.appendReplyLine(line);
        if (this.isDataReplyLine(line)) {
          dataReply = true;
          first = false;
        }
      } else if (dataReply && line.trim() === ".") {
        if (!this.isEndReplyLine(line)) {
          throw new ProtocolError(
            `Last read "." line - expected EndReplyLine but got "${line.trim()}"`,
          );
        }
        if (handlingEvent) {
          evreply.appendReplyLine(line);
        } else {
          if (first || line.trim() !== "250 OK") {
            reply.appendReplyLine(line);
          }

          break;
        }
      } else if (!dataReply && this.isEndReplyLine(line)) {
        if (handlingEvent) {
          evreply.appendReplyLine(line);
        } else {
          if (first || line.trim() !== "250 OK") {
            reply.appendReplyLine(line);
          }
          break;
        }
      } else {
        if (first && this.isDataReplyLine(line)) {
          dataReply = true;
        }

        reply.appendReplyLine(line);
        first = false;
      }

      if (handlingEvent && this.isEndReplyLine(line)) {
        handlingEvent = false;
        this.asyncEventHandler(evreply);
        first = true;
        dataReply = false;
        evreply = new ProtocolReply();
      }
    }

    return reply;
  }

  private isEventReplyLine(line: string): boolean {
    return line.startsWith("650");
  }

  /**
   * Check if a line of data sent from the controller is an "EndReplyLine".
   * An end reply line indicates the entire response to a command has now
   * been sent.
   *
   * @param line The reply line to check
   * @returns true if the line is an EndReplyLine
   */
  private isEndReplyLine(line: string): boolean {
    return /^\d{3} .*\r\n$/.test(line);
  }

  /**
   * Check if a line of data sent from the controller is a "DataReplyLine".
   *
   * @param line The reply line to check
   * @returns true if the line is a DataReplyLine
   */
  private isDataReplyLine(line: string): boolean {
    return /^\d{3}\+/.test(line);
  }

  private asyncEventHandler(reply: ProtocolReply): void {
    // If no callback is set, just return
    // if (!this._eventCallback || typeof this._eventCallback !== "function") {
    //     return;
    // }
    //
    // // Events
    // /*
    //  * CIRC
    //  * STREAM
    //  * ORCONN
    //  * BW
    //  * *Log messages (Severity = "DEBUG" / "INFO" / "NOTICE" / "WARN"/ "ERR")
    //  * NEWDESC
    //  * ADDRMAP
    //  * AUTHDIR_NEWDESCS
    //  * DESCCHANGED
    //  * *Status events (StatusType = "STATUS_GENERAL" / "STATUS_CLIENT" / "STATUS_SERVER")
    //  * GUARD
    //  * NS
    //  * STREAM_BW
    //  * CLIENTS_SEEN
    //  * NEWCONSENSUS
    //  * BUILDTIMEOUT_SET
    //  * SIGNAL
    //  * CONF_CHANGED
    //  * CIRC_MINOR
    //  * TRANSPORT_LAUNCHED
    //  * CONN_BW
    //  * CIRC_BW
    //  * CELL_STATS
    //  * TB_EMPTY
    //  * HS_DESC
    //  * HS_DESC_CONTENT
    //  * NETWORK_LIVENESS
    //  */
    // const parser = new Parser();
    // const [event] = reply[0].split(" ");
    //
    // let data: any;
    //
    // switch (event) {
    //     case "NEWCONSENSUS":
    //     case "NS":
    //         data = parser.parseRouterStatus(reply);
    //         break;
    //
    //     case "ADDRMAP":
    //         data = parser.parseAddrMap(reply[0]);
    //         break;
    //
    //     case "BW":
    //         const [, read, written] = reply[0].split(" ");
    //         data = [read, written];
    //         break;
    //
    //     case "CIRC":
    //         data = reply.getReplyLines().map((line: string) =>
    //             this.parser.parseCircuitStatusLine(line)
    //         );
    //         break;
    //
    //     // TODO: Add more built-in parsing of events
    //
    //     default:
    //         data = reply;
    //         break;
    // }
    //
    // this._eventCallback(event, data);
  }
}
