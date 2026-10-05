export interface DocumentStorageProvider {
  uploadFile(
    fileBuffer: Buffer | string,
    filename: string,
    mimeType: string
  ): Promise<{ fileUrl: string; fileHash: string }>;
  getFileUrl(filePath: string): Promise<string>;
}
