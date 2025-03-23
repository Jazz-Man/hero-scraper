class XMLBuilder {
	private children: XMLBuilder[];
	private readonly attributes: Record<string, string>;
	private text: string;

	constructor(
		private readonly rootElement: string,
		private readonly parent: XMLBuilder | null = null,
	) {
		this.children = [];
		this.attributes = {};
		this.text = "";
	}

	setAttribute(name: string, value: string): this {
		this.attributes[name] = value;
		return this;
	}

	addElement(
		tag: string,
		content = "",
		attributes: Record<string, string> = {},
	): XMLBuilder {
		const child = new XMLBuilder(tag, this);
		child.setText(content);
		for (const [key, value] of Object.entries(attributes)) {
			child.setAttribute(key, value);
		}
		this.children.push(child);
		return child;
	}

	setText(content: string): this {
		this.text = content;
		return this;
	}

	up(): XMLBuilder {
		return this.parent ?? this;
	}

	toString(indent = 0): string {
		const spaces = "  ".repeat(indent);
		const attrs = Object.entries(this.attributes)
			.map(([key, value]) => ` ${key}="${value}"`)
			.join("");

		if (this.children.length === 0) {
			return `${spaces}<${this.rootElement}${attrs}>${this.text}</${this.rootElement}>\n`;
		}

		const childrenXml = this.children
			.map((child) => child.toString(indent + 1))
			.join("");
		return `${spaces}<${this.rootElement}${attrs}>\n${childrenXml}${spaces}</${this.rootElement}>\n`;
	}
}

const xml = new XMLBuilder("filters")
	.addElement("filter") // Перший фільтр
	.addElement("from", "boss@example.com")
	.up()
	.addElement("label", "Робота")
	.up()
	.up() // Повертаємось до <filters>
	.addElement("filter") // Другий фільтр
	.addElement("to", "me@gmail.com")
	.up()
	.addElement("hasWord", "терміново")
	.up()
	.addElement("label", "Термінові")
	.up()
	.up(); // Повертаємось до <filters>

console.log(xml.toString());

const parser = new DOMParser();
