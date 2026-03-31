namespace TabTabGo.Services.Generator.Models;

/// <summary>
/// The content type of the document to convert to PDF.
/// </summary>
public enum ContentType
{
    /// <summary>Raw HTML string.</summary>
    Html,

    /// <summary>Base64-encoded DOCX (Microsoft Word) binary content.</summary>
    Docx,

    /// <summary>Word XML string (flat OOXML or Word 2003 XML).</summary>
    WordXml
}
