import JSZip from 'jszip';

const FLAT_OPC_PACKAGE_MARKER = '<pkg:package';
const PART_PATTERN = /<pkg:part\b([^>]*)>([\s\S]*?)<\/pkg:part>/gi;
const XML_DATA_PATTERN = /<pkg:xmlData(?:\s+[^>]*)?>([\s\S]*?)<\/pkg:xmlData>/i;
const BINARY_DATA_PATTERN = /<pkg:binaryData>([\s\S]*?)<\/pkg:binaryData>/i;
const ATTRIBUTE_PATTERN = /pkg:(name|contentType)="([^"]+)"/gi;

export class FlatOpcConverterService {
  isFlatOpcXml(content: string): boolean {
    return content.includes(FLAT_OPC_PACKAGE_MARKER)
      && content.includes('http://schemas.microsoft.com/office/2006/xmlPackage');
  }

  async convertToDocx(content: string): Promise<Buffer> {
    if (!this.isFlatOpcXml(content)) {
      throw new Error('Uploaded XML is not a Flat OPC Word package.');
    }

    const zip = new JSZip();
    let partCount = 0;
    const partContentTypes = new Map<string, string>();

    for (const match of content.matchAll(PART_PATTERN)) {
      const attributes = this.parsePartAttributes(match[1]);
      const partBody = match[2];
      const partName = attributes.name?.replace(/^\//, '');

      if (!partName) {
        continue;
      }

      if (attributes.contentType) {
        partContentTypes.set(partName, attributes.contentType);
      }

      const xmlDataMatch = partBody.match(XML_DATA_PATTERN);
      if (xmlDataMatch) {
        zip.file(partName, xmlDataMatch[1]);
        partCount += 1;
        continue;
      }

      const binaryDataMatch = partBody.match(BINARY_DATA_PATTERN);
      if (binaryDataMatch) {
        const base64Content = this.decodeXmlEntities(binaryDataMatch[1]).replace(/\s+/g, '');
        zip.file(partName, base64Content, { base64: true });
        partCount += 1;
      }
    }

    if (partCount === 0) {
      throw new Error('Uploaded XML does not contain any Flat OPC package parts.');
    }

    if (!zip.file('[Content_Types].xml')) {
      zip.file('[Content_Types].xml', this.buildContentTypesXml(partContentTypes));
    }

    const docxBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return Buffer.from(docxBuffer);
  }

  private parsePartAttributes(attributeSource: string): Record<string, string> {
    const attributes: Record<string, string> = {};

    for (const match of attributeSource.matchAll(ATTRIBUTE_PATTERN)) {
      attributes[match[1]] = this.decodeXmlEntities(match[2]);
    }

    return attributes;
  }

  private decodeXmlEntities(value: string): string {
    return value
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  private buildContentTypesXml(partContentTypes: Map<string, string>): string {
    const defaults = [
      { extension: 'rels', contentType: 'application/vnd.openxmlformats-package.relationships+xml' },
      { extension: 'xml', contentType: 'application/xml' },
    ];

    const overrides = Array.from(partContentTypes.entries())
      .map(([partName, contentType]) => ({
        partName: partName.startsWith('/') ? partName : `/${partName}`,
        contentType,
      }))
      .sort((a, b) => a.partName.localeCompare(b.partName));

    const escape = (value: string): string => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const defaultsXml = defaults
      .map((item) => `    <Default Extension="${escape(item.extension)}" ContentType="${escape(item.contentType)}"/>`)
      .join('\n');

    const overridesXml = overrides
      .map((item) => `    <Override PartName="${escape(item.partName)}" ContentType="${escape(item.contentType)}"/>`)
      .join('\n');

    const lines = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      defaultsXml,
      overridesXml,
      '</Types>',
    ].filter((line) => line.length > 0);

    return `${lines.join('\n')}\n`;
  }
}

export const createFlatOpcConverterService = (): FlatOpcConverterService => {
  return new FlatOpcConverterService();
};
