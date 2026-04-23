import { createHmac, randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { createOfficeFileStore } from './officeFileStore.js';

export type OfficeInputExtension = 'docx' | 'xml';

export class OfficeConverterService {
  private readonly officeFileStore = createOfficeFileStore();

  async convertToPdf(inputBuffer: Buffer, extension: OfficeInputExtension): Promise<Buffer> {
    if (!config.onlyOfficeDocumentServerUrl || !config.officeDocumentFetchBaseUrl) {
      throw new Error('OnlyOffice conversion is not configured correctly.');
    }

    const sourceFileType = extension === 'docx' ? 'docx' : 'xml';
    const fileName = `input-${randomUUID()}.${sourceFileType}`;
    const storedFile = this.officeFileStore.store({
      fileName,
      contentType:
        sourceFileType === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/xml',
      buffer: inputBuffer,
    });

    const fetchBaseUrl = config.officeDocumentFetchBaseUrl.replace(/\/+$/, '');
    const onlyOfficeBaseUrl = config.onlyOfficeDocumentServerUrl.replace(/\/+$/, '');
    const fileUrl = `${fetchBaseUrl}/v1/internal/office-files/${storedFile.id}/${storedFile.token}`;
    const convertUrl = `${onlyOfficeBaseUrl}/ConvertService.ashx`;

    const payload: Record<string, unknown> = {
      async: false,
      filetype: sourceFileType,
      outputtype: 'pdf',
      title: fileName,
      key: randomUUID(),
      url: fileUrl,
    };

    let token: string | undefined;
    if (config.onlyOfficeJwtSecret) {
      token = this.createOnlyOfficeJwt(payload, config.onlyOfficeJwtSecret);
      payload.token = token;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const convertResponse = await fetch(convertUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.onlyOfficeRequestTimeoutMs),
      });

      if (!convertResponse.ok) {
        const responseText = await convertResponse.text();
        throw new Error(`OnlyOffice convert request failed with ${convertResponse.status}: ${responseText}`);
      }

      const convertResult = await convertResponse.json() as {
        error?: number;
        fileUrl?: string;
        endConvert?: boolean;
      };

      if (typeof convertResult.error === 'number' && convertResult.error !== 0) {
        throw new Error(this.getOnlyOfficeErrorMessage(convertResult.error));
      }

      if (!convertResult.endConvert || !convertResult.fileUrl) {
        throw new Error('OnlyOffice conversion did not return a downloadable PDF URL.');
      }

      const pdfResponse = await fetch(convertResult.fileUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(config.onlyOfficeRequestTimeoutMs),
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!pdfResponse.ok) {
        const responseText = await pdfResponse.text();
        throw new Error(`OnlyOffice PDF download failed with ${pdfResponse.status}: ${responseText}`);
      }

      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      return Buffer.from(pdfArrayBuffer);
    } catch (error) {
      const errorMessage = this.toErrorMessage(error);
      throw new Error(`Office to PDF conversion failed. ${errorMessage}`.trim());
    } finally {
      this.officeFileStore.delete(storedFile.id);
    }
  }

  private createOnlyOfficeJwt(payload: Record<string, unknown>, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.toBase64Url(JSON.stringify(header));
    const encodedPayload = this.toBase64Url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
    return `${signingInput}.${signature}`;
  }

  private toBase64Url(value: string): string {
    return Buffer.from(value).toString('base64url');
  }

  private getOnlyOfficeErrorMessage(errorCode: number): string {
    const errorMap: Record<number, string> = {
      [-1]: 'Unknown OnlyOffice conversion error.',
      [-2]: 'OnlyOffice conversion timeout error.',
      [-3]: 'OnlyOffice conversion error while opening the input document.',
      [-4]: 'OnlyOffice conversion error while saving output document.',
      [-5]: 'OnlyOffice conversion error due to wrong password or access.',
      [-6]: 'OnlyOffice conversion error due to malformed input.',
      [-7]: 'OnlyOffice conversion error for unsupported input format.',
      [-8]: 'OnlyOffice conversion error for unsupported output format.',
      [-9]: 'OnlyOffice conversion error for malformed output request.',
      [-10]: 'OnlyOffice conversion error due to payload size limit.',
    };

    return errorMap[errorCode] ?? `OnlyOffice conversion failed with error code ${errorCode}.`;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown conversion error.';
  }
}

export const createOfficeConverterService = (): OfficeConverterService => {
  return new OfficeConverterService();
};
