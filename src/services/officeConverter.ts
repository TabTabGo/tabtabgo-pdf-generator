import { createHmac, randomUUID } from 'node:crypto';
import { config } from '../config/index.js';
import { getOfficeFileStore } from './officeFileStore.js';

export type OfficeInputExtension = 'docx' | 'xml';

/** Typed error thrown by {@link OfficeConverterService.convertToPdf}. */
export class OfficeConversionError extends Error {
  constructor(
    message: string,
    public readonly code: 'unconfigured' | 'timeout' | 'client-error' | 'server-error',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'OfficeConversionError';
  }
}

/** Truncate a potentially-large upstream response body before including it in an error message. */
const truncateBody = (text: string, max = 500): string =>
  text.length > max ? `${text.slice(0, max)}… [truncated]` : text;

export class OfficeConverterService {
  private readonly officeFileStore = getOfficeFileStore();

  async convertToPdf(inputBuffer: Buffer, extension: OfficeInputExtension): Promise<Buffer> {
    if (!config.onlyOfficeDocumentServerUrl || !config.officeDocumentFetchBaseUrl) {
      throw new OfficeConversionError(
        'OnlyOffice conversion is not configured correctly.',
        'unconfigured',
      );
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

    // Sign the *final* payload before any mutation, then send exclusively via
    // the Authorization header (not as a body `token` field) to avoid the
    // circular-dependency that would occur if `token` were part of what was
    // signed yet also added to the body afterwards.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (config.onlyOfficeJwtSecret) {
      const token = this.createOnlyOfficeJwt(payload, config.onlyOfficeJwtSecret);
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
        throw new OfficeConversionError(
          `OnlyOffice convert request failed with ${convertResponse.status}: ${truncateBody(responseText)}`,
          'server-error',
        );
      }

      const convertResult = await convertResponse.json() as {
        error?: number;
        fileUrl?: string;
        endConvert?: boolean;
      };

      if (typeof convertResult.error === 'number' && convertResult.error !== 0) {
        const isClientError = [-3, -6, -7].includes(convertResult.error);
        throw new OfficeConversionError(
          this.getOnlyOfficeErrorMessage(convertResult.error),
          isClientError ? 'client-error' : 'server-error',
        );
      }

      if (!convertResult.endConvert || !convertResult.fileUrl) {
        throw new OfficeConversionError(
          'OnlyOffice conversion did not return a downloadable PDF URL.',
          'server-error',
        );
      }

      // The fileUrl returned by OnlyOffice is an internal cache link that does
      // not require authentication; do not forward the JWT to an arbitrary URL.
      const pdfResponse = await fetch(convertResult.fileUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(config.onlyOfficeRequestTimeoutMs),
      });

      if (!pdfResponse.ok) {
        const responseText = await pdfResponse.text();
        throw new OfficeConversionError(
          `OnlyOffice PDF download failed with ${pdfResponse.status}: ${truncateBody(responseText)}`,
          'server-error',
        );
      }

      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      return Buffer.from(pdfArrayBuffer);
    } catch (error) {
      if (error instanceof OfficeConversionError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new OfficeConversionError(
          'OnlyOffice conversion timed out.',
          'timeout',
          { cause: error },
        );
      }

      throw new OfficeConversionError(
        `Office to PDF conversion failed. ${this.toErrorMessage(error)}`.trim(),
        'server-error',
        { cause: error },
      );
    } finally {
      if (this.officeFileStore.has(storedFile.id)) {
        // Entry still present → OnlyOffice never fetched the staged file.
        // This usually means OFFICE_DOCUMENT_FETCH_BASE_URL is unreachable
        // from the document server (network policy / misconfiguration).
        console.error(
          'OnlyOffice did not fetch the staged conversion file. ' +
          'Check that OFFICE_DOCUMENT_FETCH_BASE_URL is reachable from the document server.',
          { fileId: storedFile.id, fetchBaseUrl: config.officeDocumentFetchBaseUrl },
        );
        this.officeFileStore.delete(storedFile.id);
      }
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
