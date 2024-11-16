import * as net from "node:net";

interface torParams {
  host: string;
  port: number;
  password: string;
}

interface torResponse {
  code: number;
  command?: string;
  status?: string;
  message?: string;
  data: string;
}

interface hiddenService {
  port: number;
  host: string;
  PrivateKey: string;
  ServiceID: string;
}

export default class Tor {
  private connection: net.Socket;
  private opts: torParams;

  private responsePattern =
    /^(?<code>[0-9]{1,3})[-+](?<command>[\w\/\-$]+)=\r?\n?(?<message>.*)?\r\n?(?<status>[0-9]{1,3}\s\w+)$/ms;

  /**
   * Initializes a new instance of the Tor class with the specified parameters.
   *
   * @param {Partial<torParams>} param0 - An object containing host, port, and password.
   */
  constructor({ host, port, password }: Partial<torParams> = {}) {
    // Set default options for host, port, and password
    this.opts = {
      host: host || "localhost", // Default host is 'localhost'
      port: port || 9051, // Default port is 9051
      password: password || "", // Default password is an empty string
    };
  }

  public disconnect() {
    try {
      this.connection?.end();
    } catch (e) {
      console.error(e);
      // this.logger.error('Disconnect failed:', e)
    }
    this.connection = null;
  }

  /**
   * Establishes a connection to the Tor control port and authenticates using the provided password.
   *
   * @returns {Promise<torResponse>} A promise that resolves if authentication is successful,
   *                                or rejects with an error message if not.
   */
  async connect(): Promise<torResponse> {
    return new Promise((resolve, reject) => {
      // Create a new connection to the Tor control port
      this.connection = net.connect({
        host: this.opts.host,
        port: this.opts.port,
        // autoSelectFamily: true,
      });

      // Handle connection errors
      this.connection.on("error", (err) => {
        reject({
          type: 0,
          message: err.message,
          data: err,
        });
      });

      // Handle data received from the connection
      this.connection.on("data", (buf) => {
        const data = buf.toString();

        let ret = /([0-9]{1,3})\s(.*)\r\n/.exec(data);
        // Check if authentication was successful
        if (ret !== null && parseInt(ret[1]) === 250) {
          resolve({
            code: parseInt(ret[1]),
            message: ret[2],
            data: data,
          });
        } else {
          reject({
            code: 0,
            message: "Authentication failed",
            data: data,
          });
        }
      });

      // Send the AUTHENTICATE command with the password
      this.connection.write('AUTHENTICATE "' + this.opts.password + '"\r\n'); // Chapter 3.5
    });
  }

  /**
   * Sends a command to the Tor control port.
   *
   * @param {string} command - The command to send to the Tor control port.
   * @returns {Promise<torResponse>} A promise that resolves with the response from the Tor control port.
   */
  async sendCommand(command: string): Promise<torResponse> {
    return new Promise<torResponse>((resolve, reject) => {
      // Check that the connection has been established
      if (this.connection === undefined) {
        reject({
          code: 0,
          message: "Need a socket connection (please call connect function)",
          data: "",
        });
      }

      // Handle errors from the connection
      this.connection.on("error", (err) => {
        reject({
          code: 0,
          message: err,
          data: err,
        });
      });

      // Handle data received from the connection
      this.connection.on("data", (buf) => {
        const data = buf.toString()?.trim();

        const match = this.responsePattern.exec(data);

        try {
          const code = parseInt(match?.groups?.code);

          const message = match?.groups?.message?.trim().replace(/\r\n\.$/, "");

          resolve({
            code,
            command: match?.groups?.command,
            message,
            status: match?.groups?.status,
            data,
          });
        } catch (e) {
          // If the data is not a valid response, reject with an error message
          reject({
            code: 0,
            message: "Failed parsing data",
            data: data,
          });
        }
      });

      // Send the command to the Tor control port
      this.connection.write(command + "\r\n");
    });
  }

  /**
   * Closes the connection to the Tor control port.
   *
   * This function sends the 'QUIT' command to gracefully close the connection
   * with the Tor process. It is important to call this function when the Tor
   * client is no longer needed to ensure that resources are released properly.
   *
   * Reference:
   * - https://github.com/atd-schubert/node-tor-control/blob/master/index.js
   * - https://gitweb.torproject.org/torspec.git/tree/control-spec.txt
   *
   * @returns {Promise<torResponse>} A promise that resolves when the 'QUIT' command
   * has been successfully sent and the connection is closed.
   */
  async quit(): Promise<torResponse> {
    return this.sendCommand("QUIT");
  }

  /**
   * Sets a configuration option for the Tor process.
   *
   * This function sends the 'SETCONF' command to the Tor control port with
   * the specified configuration option and value.
   *
   * Reference:
   * - https://gitweb.torproject.org/torspec.git/tree/control-spec.txt
   *
   * @param {string} request - The configuration option and value to set.
   * @returns {Promise<torResponse>} A promise that resolves when the configuration
   * option has been successfully set.
   */
  async setConf(request: string): Promise<torResponse> {
    // Chapter 3.1
    return this.sendCommand("SETCONF " + request);
  }

  /**
   * Resets a configuration option for the Tor process.
   *
   * This function sends the 'RESETCONF' command to the Tor control port with
   * the specified configuration option.
   *
   * Reference:
   * - https://gitweb.torproject.org/torspec.git/tree/control-spec.txt
   *
   * @param {string} request - The configuration option to reset.
   * @returns {Promise<torResponse>} A promise that resolves when the configuration
   * option has been successfully reset.
   */
  async resetConf(request: string): Promise<torResponse> {
    // Chapter 3.2
    return this.sendCommand("RESETCONF " + request);
  }

  /**
   * Gets the value of a configuration option for the Tor process.
   *
   * This function sends the 'GETCONF' command to the Tor control port with
   * the specified configuration option.
   *
   * Reference:
   * - https://gitweb.torproject.org/torspec.git/tree/control-spec.txt
   *
   * @param {string} request - The configuration option to get.
   * @returns {Promise<torResponse>} A promise that resolves with the value of
   * the configuration option.
   */
  getConf(request: string): Promise<torResponse> {
    // Chapter 3.3
    return this.sendCommand("GETCONF " + request);
  }

  /**
   * Requests a list of events that have happened on the Tor network.
   *
   * Chapter 3.4 of the tor control spec.
   * @param {string} request - The events to request. May be a comma-separated
   *   string of event names, or the special value "ALL" to retrieve all events.
   * @returns {Promise<torResponse>}
   */
  getEvents(request: string): Promise<torResponse> {
    // Chapter 3.4
    return this.sendCommand("GETEVENTS " + request);
  }

  /**
   * Saves the current configuration to disk.
   *
   * This function sends the 'SAVECONF' command to the Tor control port,
   * which saves the current configuration settings to the disk.
   *
   * Reference:
   * - https://gitweb.torproject.org/torspec.git/tree/control-spec.txt
   *
   * @param {string} request - The configuration options to save.
   * @returns {Promise<torResponse>} A promise that resolves when the configuration
   * options have been successfully saved.
   */
  async saveConf(request: string): Promise<torResponse> {
    // Send the SAVECONF command to the Tor control port
    return this.sendCommand("SAVECONF " + request);
  }

  /**
   * Creates a new hidden service.
   *
   * This function sends the 'ADD_ONION' command to the Tor control port,
   * which creates a new hidden service with the specified port and optional
   * host and private key.
   *
   * Reference:
   * - https://gitweb.torproject.org/torspec.git/tree/control-spec.txt
   *
   * @param {number} port - The port number to use for the hidden service.
   * @param {string} [host] - The hostname or IP address to use for the hidden service.
   * @param {string} [privateKey] - The private key to use for the hidden service.
   * If not specified, a new key will be generated.
   * @returns {Promise<Partial<hiddenService> | {error: number, msg: string}>}
   * A promise that resolves with the hidden service information if the
   * operation was successful, or rejects with an error message otherwise.
   */
  async addOnion(
    port: number,
    host?: string,
    privateKey?: string,
  ): Promise<Partial<hiddenService> | { error: number; msg: string }> {
    let key = privateKey ? privateKey : "NEW:BEST";
    let response = await this.sendCommand(
      "ADD_ONION " +
        key +
        " Port=" +
        port +
        (host != undefined ? "," + host : ""),
    );

    if (response.code === 250) {
      let objArray = response.data
        .split("\r\n")
        .map((e) => e.split("250-")[1])
        .filter((e) => e)
        .map((e) => [e.split("=")[0], e.split("=").slice(1).join("=")]);
      let onion: Partial<hiddenService> = objArray.reduce(
        (obj, e) => Object.assign(obj, { [e[0]]: e[1] }),
        {},
      );

      onion.PrivateKey = onion.PrivateKey || privateKey;
      if (onion.ServiceID) onion.ServiceID += ".onion";

      return onion;
    } else {
      return {
        error: response.code,
        msg: response.data,
      };
    }
  }

  /**
   * Deletes a hidden service.
   *
   * Chapter 3.6 of the tor control spec.
   * @param {string} serviceId - The service ID of the hidden service to delete.
   * @returns {Promise<torResponse>} - A promise that resolves when the hidden service has been deleted.
   */
  async delOnion(serviceId: string): Promise<torResponse> {
    // Send the DEL_ONION command to the Tor control port
    return this.sendCommand("DEL_ONION " + serviceId.replace(/\.onion/, ``));
  }

  /**
   * Sends a signal to the Tor process.
   *
   * Chapter 3.7 of the tor control spec.
   * @param {string} signal - The signal to send to the Tor process.
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signal(signal: string): Promise<torResponse> {
    // Chapter 3.7
    return this.sendCommand(`SIGNAL ${signal}`);
  }

  /**
   * Reloads the Tor configuration.
   *
   * Sends a HUP signal to the Tor process, which causes it to reload its configuration.
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalReload(): Promise<torResponse> {
    return this.signal("RELOAD");
  }

  /**
   * Reloads the Tor configuration.
   *
   * Sends a HUP signal to the Tor process, which causes it to reload its configuration.
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalHup(): Promise<torResponse> {
    return this.signal("HUP");
  }

  /**
   * Shuts down the Tor process.
   *
   * Sends a SHUTDOWN signal to the Tor process, which requests it to terminate.
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalShutdown(): Promise<torResponse> {
    // Send the SHUTDOWN signal to the Tor process
    return this.signal("SHUTDOWN");
  }

  /**
   * Dumps the current state of Tor to disk.
   *
   * Sends a DUMP signal to the Tor process, which causes it to dump its current state
   * to disk.
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalDump(): Promise<torResponse> {
    // Send the DUMP signal to the Tor process
    return this.signal("DUMP");
  }

  /**
   * Sends a USR1 signal to the Tor process, which causes it to flush its log files.
   *
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalUsr1(): Promise<torResponse> {
    // Send the USR1 signal to the Tor process
    return this.signal("USR1");
  }

  /**
   * Sends a DEBUG signal to the Tor process.
   *
   * This signal is used to enable verbose logging for debugging purposes.
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalDebug(): Promise<torResponse> {
    // Send the DEBUG signal to the Tor process
    return this.signal("DEBUG");
  }

  /**
   * Sends a USR2 signal to the Tor process.
   *
   * This signal is typically used for application-defined purposes.
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalUsr2(): Promise<torResponse> {
    // Send the USR2 signal to the Tor process
    return this.signal("USR2");
  }

  /**
   * Sends a HALT signal to the Tor process.
   *
   * This signal causes Tor to immediately shut down, without closing any
   * connections or cleaning up any resources.
   *
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalHalt(): Promise<torResponse> {
    // Send the HALT signal to the Tor process
    return this.signal("HALT");
  }

  /**
   * Sends a TERM signal to the Tor process.
   *
   * This signal causes Tor to shut down, but unlike the HALT signal,
   * Tor will close all its connections and clean up all its resources
   * before terminating.
   *
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalTerm(): Promise<torResponse> {
    return this.signal("TERM");
  }

  /**
   * Sends an INT signal to the Tor process.
   *
   * This signal causes Tor to shut down immediately, without closing any
   * connections or cleaning up any resources.
   *
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalInt(): Promise<torResponse> {
    return this.signal("INT");
  }

  /**
   * Requests a new identity from Tor.
   *
   * This command requests that Tor use a new circuit for new
   * application requests. The syntax is as follows:
   *
   * SIGNAL NEWNYM
   *
   * @returns {Promise<torResponse>} - A promise that resolves when the Tor process has been signaled.
   */
  async signalNewnym(): Promise<torResponse> {
    return this.signal("NEWNYM");
  }

  /**
   * Clears the DNS cache.
   *
   * This command clears the DNS cache.
   */
  async signalCleardnscache(): Promise<torResponse> {
    return this.signal("CLEARDNSCACHE");
  }

  /**
   * Maps an address to a virtual address.
   *
   * This command maps an address to a virtual address. The syntax is as
   * follows:
   *
   * MAPADDRESS address
   *
   * The address is a string of the form "IP:port" or "hostname:port".
   *
   * Tor will reply with an acknowledgment message, or an error message
   * if the mapping cannot be done.
   *
   * @param {string} address The address to map.
   * @returns A promise that resolves when the mapping has been done.
   */
  async mapAddress(address: string): Promise<torResponse> {
    // Chapter 3.8
    return this.sendCommand(`MAPADDRESS ${address}`);
  }

  /**
   * Query information about Tor's state and configuration.
   *
   * The `GETINFO` command is used to query information about Tor's state and
   * configuration. The information that Tor knows is as follows:
   *
   * * `version`: The version of the Tor process.
   * * ` accountability`: "disabled" if Tor is not accountable, or a string
   *   describing the accountability setup otherwise.
   * * `address`: The external IP address we claim to have.
   * * `bw-accounting-enforced`: Whether or not bandwidth accounting is
   *   enforced.
   * * `bw-accounting-incattr`: The accounting attribute (cell or byte) that
   *   is incremented for each incoming relayed byte.
   * * `bw-event-cache`: The number of bytes that the bw-event-cache is
   *   currently using.
   * * `consensus-digest/:digest-type/`: The current value of the consensus
   *   digest of type `digest-type`.
   * * `consensus-missing/:authority-id/`: True iff the named authority is
   *   missing from our current consensus.
   * * `consensus-notices/:what/`: A list of notices about the current
   *   consensus.
   * * `consensus-notices/:what/`: A list of notices about the current
   *   consensus.
   * * `config/names`: A list of configuration options that are not
   *   variable-length arrays.
   * * `config/defaults`: A list of default values for variables.
   * * `config/variable-length-arrays`: A list of variable-length array
   *   configuration options.
   * * `config/types`: A list of configuration options and their types.
   * * `current-consensus`: The contents of the current consensus.
   * * `dir/notification`: A list of notifications about the current
   *   directory.
   * * `entry-guards`: A summary of our current entry guards.
   * * `fingerprint/:fingerprint/`: The nickname and IP of the relay with
   *   fingerprint `fingerprint`.
   * * `ip-to-country/:ip-address/`: The country code of the IP address
   *   `ip-address`.
   * * `ip-to-country/:ip-address/`: The country code of the IP address
   *   `ip-address`.
   * * `network-liveness`: "up" if we have been able to connect to the Tor
   *   network, "down" otherwise.
   * * `network-size`: The number of nodes in the current network-status
   *   consensus.
   * * `onion/current`: The current value of the hidden-service directory.
   * * `onion/descriptor/:hs/service-id/`: The value of the hidden-service
   *   descriptor for service-id `service-id`.
   * * `onion/descriptor-cache/:hs/service-id/`: The contents of the
   *   hidden-service descriptor cache for service-id `service-id`.
   * * `onion/recent-intro-point/:hs/service-id/`: The most recent
   *   introduction point for service-id `service-id`.
   * * `onion/seen-service-descriptor/:hs/service-id/`: The time at which we
   *   most recently saw a descriptor for service-id `service-id`.
   * * `options/activesoftwareinfo`: The contents of the current
   *   softwareinfo message.
   * * `options/active/current`: The current set of active options.
   * * `options/diff/[:from-versions/][:to-versions/][:from-file/][:to-file/]:
   *   The differences between two sets of options.
   * * `options/effd/[:from-versions/][:to-versions/][:from-file/][:to-file/]:
   *   The effective differences between two sets of options.
   * * `options/names`: A list of configuration options that are not
   *   variable-length arrays.
   * * `options/defaults`: A list of default values for variables.
   * * `options/variable-length-arrays`: A list of variable-length array
   *   configuration options.
   * * `options/types`: A list of configuration options and their types.
   * * `options/versions/[:from-versions/][:to-versions/][:from-file/][:to-file/]:
   *   The version numbers that are supported by the options.
   * * `orconn-status`: A list of our current OR connections.
   * * `protocol-versions`: A list of protocol versions and their status.
   * * `router-digest/:digest-type/`: The current value of the router
   *   digest of type `digest-type`.
   * * `router-status/:status-type/`: A list of our current router status
   *   entries.
   * * `signal/:signal/`: True iff the signal `signal` is enabled.
   * * `stream-status`: A list of our current stream status entries.
   * * `stream-event-cache`: The number of bytes that the stream-event-cache
   *   is currently using.
   * * `traffic/read`: The total number of bytes read from the network.
   * * `traffic/written`: The total number of bytes written to the network.
   * * `traffic/relay-read-bytes`: The total number of relay cells read from
   *   the network.
   * * `traffic/relay-written-bytes`: The total number of relay cells written
   *   to the network.
   * * `traffic/relay-read-cells`: The total number of relay cells read from
   *   the network.
   * * `traffic/relay-written-cells`: The total number of relay cells written
   *   to the network.
   * * `traffic/relay-read-packets`: The total number of relay cells read from
   *   the network.
   * * `traffic/relay-written-packets`: The total number of relay cells
   *   written to the network.
   * * `traffic/bytes-read`: The total number of bytes read from the network.
   * * `traffic/bytes-written`: The total number of bytes written to the
   *   network.
   * * `traffic/relay-bytes-read`: The total number of relay cells read from
   *   the network.
   * * `traffic/relay-bytes-written`: The total number of relay cells written
   *   to the network.
   * * `traffic/relay-packets-read`: The total number of relay cells read from
   *   the network.
   * * `traffic/relay-packets-written`: The total number of relay cells
   *   written to the network.
   * * `traffic/seconds-connected`: The number of seconds that we have been
   *   connected to the network.
   * * `traffic/seconds-connection-overhead`: The number of seconds that we
   *   have been connected to the network, including network overhead.
   * * `traffic/seconds-connection-overhead/read`: The number of seconds that
   *   we have been connected to the network, including network overhead.
   * * `traffic/seconds-connection-overhead/written`: The number of seconds
   *   that we have been connected to the network, including network
   *   overhead.
   * * `transport/listen`: A list of our current transport listeners.
   * * `uptime`: The number of seconds that Tor has been running.
   * * `version/[:version/][:all]`: A list of the Tor versions we support.
   *
   * @param {string|Array} request The specific information to query from Tor.
   * @returns A promise that resolves with a string containing the requested
   *   information.
   */
  async getInfo(request: string | string[]): Promise<torResponse> {
    // Chapter 3.9
    if (!Array.prototype.isPrototypeOf(request)) {
      // @ts-ignore
      request = [request];
    }

    // @ts-ignore
    return this.sendCommand(`GETINFO ${request.join(" ")}`);
  }

  /**
   * Extends a circuit. The syntax is as follows:
   *
   * EXTENDCIRCUIT circ-id [node-id] [purpose]
   *
   * If `node-id` is provided, it is the ID of the node at which to extend the
   * circuit. If `purpose` is provided, it specifies the purpose for which
   * the circuit should be used. Otherwise, the circuit is used for general
   * purposes.
   *
   * @param {string} id The ID of the circuit to extend.
   * @param {string|null} superspec The ID of the node at which to extend the
   *   circuit. May be `null`.
   * @param {string|null} purpose The purpose for which the circuit should be
   *   used. May be `null`.
   * @returns A promise that resolves when the circuit has been extended.
   */
  extendCircuit(
    id: string,
    superspec: string | null = null,
    purpose: string | null = null,
  ) {
    // Chapter 3.10
    let str = `EXTENDCIRCUIT ${id}`;
    if (superspec) {
      str += ` ${superspec}`;
    }
    if (purpose) {
      str += ` ${purpose}`;
    }
    return this.sendCommand(str);
  }

  /**
   * Sets the purpose of a circuit.
   *
   * The syntax is as follows:
   *
   * SETCIRCUITPURPOSE circ-id purpose=purpose
   *
   * @param {string} id The ID of the circuit to set the purpose for.
   * @param {string} purpose The purpose of the circuit.
   * @returns A promise that resolves when the circuit's purpose has been set.
   */
  setCircuitPurpose(id: string, purpose: string) {
    // Chapter 3.11
    return this.sendCommand(`SETCIRCUITPURPOSE ${id} purpose=${purpose}`);
  }

  /**
   * Sets the purpose of a router.
   *
   * The syntax is as follows:
   *
   * SETROUTERPURPOSE nickname-or-key purpose=purpose
   *
   * @param {string} nicknameOrKey The nickname or key of the router
   * whose purpose should be set.
   * @param {string} purpose The purpose to set for the router.
   * @returns A promise that resolves when the router's purpose has been set.
   */
  setRouterPurpose(nicknameOrKey: string, purpose: string) {
    // Chapter 3.12
    return this.sendCommand(`SETROUTERPURPOSE ${nicknameOrKey} ${purpose}`);
  }

  /**
   * Attach a stream to a circuit.
   *
   * The syntax is as follows:
   *
   * ATTACHSTREAM stream-id circuit-id [hop-spec]
   *
   * @param {number} streamId The ID of the stream to attach.
   * @param {number} circuitId The ID of the circuit to attach the stream to.
   * @param {number} [hop] The ID of the hop in the circuit to attach the
   * stream to. If not specified, the stream will be attached to the first
   * available hop in the circuit.
   * @returns A promise that resolves when the stream has been attached to the
   * circuit.
   */
  attachStream(streamId: number, circuitId: number, hop?: number) {
    // Chapter 3.13
    let str = `ATTACHSTREAM ${streamId} ${circuitId}`;

    if (hop) {
      str += ` ${hop}`;
    }

    return this.sendCommand(str);
  }
}
