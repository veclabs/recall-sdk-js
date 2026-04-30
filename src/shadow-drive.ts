// Shadow Drive deprecated — replaced by Irys in recall-api hosted layer
export class ShadowDriveClient {
  constructor(..._args: any[]) {}
  async initialize(): Promise<void> {}
  async uploadCollection(_name: string, _data: Buffer): Promise<void> {}
  async downloadCollection(_name: string): Promise<Buffer | null> { return null; }
}