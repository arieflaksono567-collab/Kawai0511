import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { DocumentStorageProvider } from './document-storage.interface';

@Injectable()
export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  async uploadFile(
    fileBuffer: Buffer | string,
    filename: string,
    mimeType: string
  ): Promise<{ fileUrl: string; fileHash: string }> {
    const raw = typeof fileBuffer === 'string' ? Buffer.from(fileBuffer) : fileBuffer;
    const fileHash = crypto.createHash('sha256').update(raw).digest('hex');
    const safeFilename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fileUrl = `/storage/kyc/${safeFilename}`;

    return { fileUrl, fileHash };
  }

  async getFileUrl(filePath: string): Promise<string> {
    return filePath;
  }
}
