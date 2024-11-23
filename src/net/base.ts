export default class BaseTCPClient {
    protected resolveData: ((data: Buffer) => void) | null = null;

    async receive(): Promise<Buffer> {
        return new Promise((resolve) => {
            this.resolveData = resolve;
        });
    }

    protected handleData(data: Buffer): void {
        if (this.resolveData) {
            const resolve = this.resolveData;
            this.resolveData = null;
            resolve(data);
        }
    }
}
