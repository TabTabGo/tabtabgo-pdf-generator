import { execFile } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { config } from '../config/index.js';
import { createOfficeFileStore } from './officeFileStore.js';

const execFileAsync = promisify(execFile);

export type OfficeInputExtension = 'docx' | 'xml';

const WINDOWS_SOFFICE_CANDIDATES = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.com',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
];

const POSIX_SOFFICE_CANDIDATES = [
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
  '/snap/bin/libreoffice',
];

export class OfficeConverterService {
  private cachedExecutablePath: string | null = null;
  private readonly officeFileStore = createOfficeFileStore();

  async convertToPdf(inputBuffer: Buffer, extension: OfficeInputExtension): Promise<Buffer> {
    if (config.officeConversionEngine === 'onlyoffice') {
      return this.convertWithOnlyOffice(inputBuffer, extension);
    }

    return this.convertWithLibreOffice(inputBuffer, extension);
  }

  private async convertWithLibreOffice(inputBuffer: Buffer, extension: OfficeInputExtension): Promise<Buffer> {
    const executablePath = await this.resolveSofficeExecutablePath();

    // Expand Windows 8.3 short names so LibreOffice receives the full real path
    const baseTempDir = realpathSync.native(tmpdir());
    const tempDir = await mkdtemp(join(baseTempDir, 'tabtabgo-office-'));

    const inputPath = join(tempDir, `input.${extension}`);
    const outputPath = join(tempDir, 'input.pdf');

    // Give each invocation its own isolated LibreOffice user profile.
    // This prevents profile locking between concurrent or repeated calls and
    // is the correct headless pattern on both Windows and Linux.
    const userInstallDir = join(tempDir, 'lo-profile');
    const userInstallUri = 'file:///' + userInstallDir.replace(/\\/g, '/');

    // cwd must be LibreOffice's own program directory so it can find its
    // platform-independent libraries on Windows at startup.
    const libreofficeProgramDir = dirname(executablePath);

    try {
      await writeFile(inputPath, inputBuffer);

      let execStdout = '';
      let execStderr = '';
      try {
        const execResult = await execFileAsync(
          executablePath,
          [
            `-env:UserInstallation=${userInstallUri}`,
            '--headless',
            '--nologo',
            '--nodefault',
            '--nolockcheck',
            '--nofirststartwizard',
            '--convert-to',
            'pdf',
            '--outdir',
            tempDir,
            inputPath,
          ],
          {
            cwd: process.platform === 'win32' ? libreofficeProgramDir : tempDir,
            windowsHide: true,
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024,
            env: { ...process.env },
          },
        );
        execStdout = execResult.stdout ?? '';
        execStderr = execResult.stderr ?? '';
      } catch (execError) {
        const errorMessage = this.toErrorMessage(execError);
        throw new Error(`Office to PDF conversion failed. ${errorMessage}`.trim());
      }

      try {
        return await readFile(outputPath);
      } catch {
        // LibreOffice exited successfully but produced no output file.
        // Include its stdout/stderr to explain why.
        const loOutput = [execStdout, execStderr]
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .join(' | ');
        throw new Error(
          `Office to PDF conversion failed: LibreOffice did not produce an output file.${loOutput ? ` LibreOffice output: ${loOutput}` : ' No output from LibreOffice.'}`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Office to PDF conversion failed')) {
        throw error;
      }
      const errorMessage = this.toErrorMessage(error);
      throw new Error(`Office to PDF conversion failed. ${errorMessage}`.trim());
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async convertWithOnlyOffice(inputBuffer: Buffer, extension: OfficeInputExtension): Promise<Buffer> {
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

  private async resolveSofficeExecutablePath(): Promise<string> {
    if (this.cachedExecutablePath) {
      return this.cachedExecutablePath;
    }

    const configuredPath = process.env.LIBREOFFICE_PATH?.trim();
    if (configuredPath) {
      const resolvedConfiguredPath = await this.resolvePreferredExecutable(configuredPath);
      this.cachedExecutablePath = resolvedConfiguredPath;
      return resolvedConfiguredPath;
    }

    const candidates = process.platform === 'win32'
      ? WINDOWS_SOFFICE_CANDIDATES
      : POSIX_SOFFICE_CANDIDATES;

    if (process.platform !== 'win32') {
      const executableFromPath = await this.resolveExecutableFromPath();
      if (executableFromPath) {
        this.cachedExecutablePath = executableFromPath;
        return executableFromPath;
      }
    }

    for (const candidate of candidates) {
      try {
        await this.ensureExecutableExists(candidate);
        this.cachedExecutablePath = candidate;
        return candidate;
      } catch {
        // Try next candidate.
      }
    }

    throw new Error(
      'LibreOffice executable was not found. Install LibreOffice and set LIBREOFFICE_PATH if needed.',
    );
  }

  private async ensureExecutableExists(pathToExecutable: string): Promise<void> {
    await access(pathToExecutable);
  }

  private async resolvePreferredExecutable(pathToExecutable: string): Promise<string> {
    await this.ensureExecutableExists(pathToExecutable);

    if (process.platform !== 'win32' || !pathToExecutable.toLowerCase().endsWith('.exe')) {
      return pathToExecutable;
    }

    const comPath = pathToExecutable.slice(0, -4) + '.com';
    try {
      await this.ensureExecutableExists(comPath);
      return comPath;
    } catch {
      return pathToExecutable;
    }
  }

  private async resolveExecutableFromPath(): Promise<string | null> {
    const pathValue = process.env.PATH;
    if (!pathValue) {
      return null;
    }

    const segments = pathValue
      .split(process.platform === 'win32' ? ';' : ':')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    for (const segment of segments) {
      const candidate = join(segment, 'soffice');
      try {
        await this.ensureExecutableExists(candidate);
        return candidate;
      } catch {
        // Ignore missing entry and keep searching.
      }
    }

    return null;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const typedError = error as Error & { stderr?: string; stdout?: string };
      const details = [typedError.message, typedError.stderr, typedError.stdout]
        .filter((part) => typeof part === 'string' && part.trim().length > 0)
        .join(' | ');
      return details;
    }

    return 'Unknown conversion error.';
  }
}

export const createOfficeConverterService = (): OfficeConverterService => {
  return new OfficeConverterService();
};