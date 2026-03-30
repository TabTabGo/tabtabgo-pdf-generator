using TabTabGo.Services.Generator.Models;

namespace TabTabGo.Services.Generator;

/// <summary>
/// Defines the contract for interacting with the TabTabGo PDF Generator service.
/// </summary>
public interface IGeneratorClient
{
    /// <summary>
    /// Converts an HTML string to a PDF document.
    /// </summary>
    /// <param name="htmlContent">Raw HTML string to convert.</param>
    /// <param name="options">Optional PDF rendering options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A byte array containing the generated PDF.</returns>
    Task<byte[]> GeneratePdfFromHtmlAsync(
        string htmlContent,
        PdfOptions? options = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Converts a base64-encoded DOCX document to a PDF document.
    /// </summary>
    /// <param name="docxBase64">Base64-encoded DOCX binary content.</param>
    /// <param name="options">Optional PDF rendering options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A byte array containing the generated PDF.</returns>
    Task<byte[]> GeneratePdfFromDocxAsync(
        string docxBase64,
        PdfOptions? options = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Converts a Word XML document to a PDF document.
    /// </summary>
    /// <param name="wordXml">Word XML string (flat OOXML or Word 2003 XML).</param>
    /// <param name="options">Optional PDF rendering options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A byte array containing the generated PDF.</returns>
    Task<byte[]> GeneratePdfFromWordXmlAsync(
        string wordXml,
        PdfOptions? options = null,
        CancellationToken cancellationToken = default);
}
