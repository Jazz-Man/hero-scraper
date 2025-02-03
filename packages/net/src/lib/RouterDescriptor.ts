export default class RouterDescriptor {
  nickname: string;
  fingerprint: string;
  digest: string;
  published: string;
  ip_address: string;
  ipv6_address: string;
  or_port: number;
  dir_port: number;
  or_address: string[] = [];
  platform: string;
  contact: string;
  family: string[] = [];
  uptime: number;
  allow_single_hop_exits: boolean = false;
  caches_extra_info: boolean = false;
  onion_key: string;
  ntor_onion_key: string;
  signing_key: string;
  router_signature: string;
  ed25519_key: string;
  ed25519_sig: string;
  ed25519_identity: string;
  onion_key_crosscert: string;
  ntor_onion_key_crosscert: string;
  ntor_onion_key_crosscert_signbit: string;
  protocols: string;
  proto: Record<string, string[]> = {};
  extra_info_digest: string;
  hidden_service_dir: boolean = false;
  bandwidth: string;
  bandwidth_measured: number;
  bandwidth_unmeasured: number;
  bandwidth_average: number;
  bandwidth_burst: number;
  bandwidth_observed: number;
  flags: string[] = [];
  tunnelled_directory_server: boolean = false;
  exit_policy4: { accept: string[]; reject: string[] } = {
    accept: [],
    reject: [],
  };
  exit_policy6: { accept: string[]; reject: string[] } = {
    accept: [],
    reject: [],
  };
  country: string | null = null;

  toString(): string {
    let str = `Nickname: ${this.nickname}  Fingerprint: ${this.fingerprint}\n`;

    if (this.uptime) {
      const uptime = this.getCurrentUptime(true) as Record<string, number>;
      const u = `${uptime.days ? `${uptime.days}d ` : ""}${
        uptime.hours ? `${uptime.hours}h ` : ""
      }${uptime.minutes ? `${uptime.minutes}m ` : ""}${uptime.seconds ? `${uptime.seconds}s` : ""}`;
      str += `Uptime:   ${u.trim()}\n`;
    }

    if (this.flags.length) {
      str += `Flags:    ${this.flags.join(" ")}\n`;
    }

    if (this.bandwidth) {
      str += `Weight:   ${this.bandwidth}\n`;
    }

    if (this.bandwidth_observed > 0) {
      str += `Bandwidth: ${(this.bandwidth_observed / 1_000_000).toFixed(2)} MB/s\n`;
    }

    str += `Platform: ${this.platform}\n`;
    str += `Contact:  ${this.contact}\n`;
    str += `IP Addr:  ${this.ip_address}\n`;

    if (this.country) {
      str += `Country:  ${this.country.toUpperCase()}\n`;
    }

    str += `OR Port:  ${this.or_port}  Dir Port: ${this.dir_port}\n`;
    str += `Exit Policy:\n    accept ${this.exit_policy4.accept.join(" ")}\n    reject ${this.exit_policy4.reject.join(" ")}\n`;

    return str;
  }

  setArray(values: Record<string, any>): this {
    for (const [key, value] of Object.entries(values)) {
      if (key === "exit_policy4" || key === "exit_policy6") {
        const policy = this[key as "exit_policy4" | "exit_policy6"];

        if (value.accept) {
          const res = this.parsePolicy(value.accept);
          policy.accept = [...policy.accept, ...res];
        }

        if (value.reject) {
          const res = this.parsePolicy(value.reject);

          policy.reject = [...policy.reject, ...res];
        }
      } else if (key === "or_address") {
        this.or_address.push(value);
      } else if (Object.prototype.hasOwnProperty.call(this, key)) {
        (this as any)[key] = value;
      }
    }

    return this;
  }

  private parsePolicy(policy: string | string[]): string[] {
    return Array.isArray(policy)
      ? policy
      : policy.includes(",")
        ? policy.split(",")
        : policy.split(" ");
  }

  getArray(): Record<string, any> {
    return { ...this };
  }

  combine(descriptor: RouterDescriptor): this {
    for (const key in this) {
      // @ts-ignore
      if (!this[key as keyof this] && descriptor[key as keyof this]) {
        // @ts-ignore
        this[key as keyof this] = descriptor[key as keyof this];
      }
    }

    return this;
  }

  getCurrentUptime(
    asArray: boolean = false,
  ): number | Record<string, number> | null {
    if (this.published && this.uptime) {
      const uptime =
        this.uptime +
        Date.now() / 1000 -
        new Date(this.published + " GMT").getTime() / 1000;

      if (!asArray) return uptime;

      return {
        days: Math.floor(uptime / 86400),
        hours: Math.floor((uptime % 86400) / 3600),
        minutes: Math.floor((uptime % 3600) / 60),
        seconds: Math.floor(uptime % 60),
      };
    }

    return null;
  }
}
