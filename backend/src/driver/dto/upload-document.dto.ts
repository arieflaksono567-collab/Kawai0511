export type KycDocumentType = 'KTP' | 'SIM_C' | 'STNK' | 'SKCK';

export class UploadDocumentDto {
  documentType: KycDocumentType;
  documentNumber: string;
  documentName?: string;
  file?: string; // base64 or file payload
  issuedAt?: string;
  expiresAt?: string;
}
