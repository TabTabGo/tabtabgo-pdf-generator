using System.Text.Json.Serialization;

namespace TabTabGo.Service.Generator.Models;

/// <summary>
/// Request payload for the <c>POST /documents/pdf</c> endpoint.
/// </summary>
internal class PdfRequest
{
    /// <summary>
    /// Content type string as expected by the service API ("html", "docx", "word-xml").
    /// </summary>
    [JsonPropertyName("contentType")]
    public required string ContentType { get; init; }

    /// <summary>
    /// Document content: raw HTML, base64-encoded DOCX, or Word XML string.
    /// </summary>
    [JsonPropertyName("content")]
    public required string Content { get; init; }

    /// <summary>
    /// Optional PDF rendering options.
    /// </summary>
    [JsonPropertyName("options")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public PdfOptions? Options { get; init; }
}
