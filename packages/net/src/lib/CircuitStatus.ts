export default class CircuitStatus {
	id: number | string | null = null;
	status: string | null = null;
	path: [string, string][] = [];
	buildFlags: string[] = [];
	purpose: string | null = null;
	hsState: string | null = null;
	rendQuery: string | null = null;
	created: string | null = null;
	reason: string | null = null;
	remoteReason: string | null = null;
	socksUsername: string | null = null;
	socksPassword: string | null = null;

	/**
	 * Converts the circuit status object into a string representation.
	 * @returns A formatted string describing the circuit.
	 */
	toString(): string {
		const type = ["Guard", "Middle", "Exit"];
		let path = "";

		if (this.path.length > 0) {
			this.path.forEach((p, index) => {
				const what = type[index] || "";
				path += `  ${p[0]}  ${p[1].padEnd(19)} `;

				if (
					!this.buildFlags.includes("ONEHOP_TUNNEL") &&
					this.path.length === 3
				) {
					path += `   ${index + 1} / ${what}`;
				}

				path += "\n";
			});
		}

		return (
			`Purpose: ${this.purpose?.padEnd(8)}  ` +
			`Flags: ${this.buildFlags.join(" ")}   ` +
			`Circuit ID: ${this.id}   ${this.status}  ${this.getAge()}\n` +
			`${path}\n`
		);
	}

	/**
	 * Calculates the age of the circuit based on the `created` timestamp.
	 * @returns The age of the circuit as a formatted string (e.g., "1h15m").
	 */
	protected getAge(): string {
		if (this.created) {
			const createdDate = new Date(this.created);
			const now = new Date();
			const diff = now.getTime() - createdDate.getTime();

			const hours = Math.floor(diff / (1000 * 60 * 60));
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

			return `${hours}h${minutes}m`;
		}
		return "";
	}
}
