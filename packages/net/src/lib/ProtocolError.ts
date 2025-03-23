export class ProtocolError extends Error {
	/**
	 * Constructor for the ProtocolError class.
	 *
	 * @param message - Error message
	 */
	constructor(message: string) {
		super(message);
		this.name = "ProtocolError";
	}

	/**
	 * Get the status code of the controller protocol reply.
	 *
	 * Note: In TypeScript, the `Error` class doesn't have a `getStatusCode` method.
	 * You might need to define custom behavior if the `statusCode` is specific to your use case.
	 */
	public getStatusCode(): string | undefined {
		// You can implement specific logic here if needed.
		return undefined;
	}
}
