export default class ProtocolReply {
  private statusCode?: string;
  private command?: string;
  private dataReply: boolean = false;
  private lines: Map<number, string> = new Map();
  private dirty: boolean = true;

  // Для ітерації
  private currentIndex: number = 0;

  constructor(command?: string) {
    this.command = command;
  }

  getCommand(): string | undefined {
    return this.command;
  }

  getStatusCode(): string | undefined {
    return this.statusCode;
  }

  toString(): string {
    return Array.from(this.lines.values()).join("\n");
  }

  getReplyLines(): string[] {
    return Array.from(this.lines.values());
  }

  appendReplyLine(line: string): void {
    this.dirty = true;
    let status: string | null = null;
    const first = this.lines.size === 0;
    line = line.trim();
    const command = this.command || "";

    const patterns = [
      { regex: new RegExp(`^(\\d{3})-${command}=(.*)$`), type: "commandData" },
      { regex: new RegExp(`^(\\d{3})\\+${command}=$`), type: "commandStart" },
      { regex: /^650[+\-]/, type: "eventNotification" },
      { regex: /^(\\d{3})-(.*)$/, type: "dataResponse" },
      { regex: /^(25\\d)\\s*(.*)$/, type: "status" },
      { regex: /^([456][015]\\d)\\s*(.*)$/, type: "error" },
    ];

    for (const { regex, type } of patterns) {
      const match = line.match(regex);
      if (match) {
        switch (type) {
          case "commandData":
            status = match[1];
            if (match[2].trim()) this.lines.set(this.lines.size, match[2]);
            break;
          case "commandStart":
            status = match[1];
            this.dataReply = true;
            break;
          case "eventNotification":
            status = "650";
            this.lines.set(this.lines.size, line.slice(4));
            break;
          case "dataResponse":
            status = match[1];
            this.lines.set(this.lines.size, match[2]);
            break;
          case "status":
          case "error":
            if (!this.statusCode) status = match[1];
            this.lines.set(this.lines.size, match[2]);
            break;
        }
        break;
      }
    }

    if (!status) this.lines.set(this.lines.size, line);
    if (status && first) this.statusCode = status;
  }

  appendReplyLines(lines: string[]): void {
    lines.forEach((line) => this.appendReplyLine(line));
    this.dirty = true;
  }

  isPositiveReply(): boolean {
    return this.statusCode?.startsWith("2") || false;
  }

  shift(): string | undefined {
    const firstKey = Array.from(this.lines.keys())[0];
    const value = this.lines.get(firstKey);
    this.lines.delete(firstKey);
    return value;
  }

  // Ітераційні методи
  next(): string | undefined {
    if (this.valid()) {
      const value = this.lines.get(this.currentIndex);
      this.currentIndex++;
      return value;
    }
    return undefined;
  }

  current(): string | undefined {
    return this.lines.get(this.currentIndex);
  }

  valid(): boolean {
    return this.currentIndex < this.lines.size;
  }

  // Map-like methods
  has(key: number): boolean {
    return this.lines.has(key);
  }

  get(key: number): string | undefined {
    return this.lines.get(key);
  }

  set(key: number, value: string): void {
    this.lines.set(key, value);
    this.dirty = true;
  }

  delete(key: number): boolean {
    const result = this.lines.delete(key);
    this.dirty = true;
    return result;
  }

  clear(): void {
    this.lines.clear();
    this.dirty = true;
    this.currentIndex = 0;
  }

  size(): number {
    return this.lines.size;
  }
}
