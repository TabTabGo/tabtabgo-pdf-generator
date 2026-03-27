using System.Text.Json.Serialization;

namespace TabTabGo.Service.Generator.Models;

/// <summary>
/// Puppeteer-compatible margin settings for the generated PDF.
/// </summary>
public class PdfMargin
{
    /// <summary>Top margin (e.g., "1cm", "10px").</summary>
    [JsonPropertyName("top")]
    public string? Top { get; set; }

    /// <summary>Right margin (e.g., "1cm", "10px").</summary>
    [JsonPropertyName("right")]
    public string? Right { get; set; }

    /// <summary>Bottom margin (e.g., "1cm", "10px").</summary>
    [JsonPropertyName("bottom")]
    public string? Bottom { get; set; }

    /// <summary>Left margin (e.g., "1cm", "10px").</summary>
    [JsonPropertyName("left")]
    public string? Left { get; set; }
}

/// <summary>
/// Puppeteer-compatible PDF rendering options.
/// All properties are optional and match the Puppeteer PDFOptions interface.
/// </summary>
public class PdfOptions
{
    /// <summary>Paper format, e.g., "A4", "Letter", "Legal".</summary>
    [JsonPropertyName("format")]
    public string? Format { get; set; }

    /// <summary>Paper width, e.g., "8.5in", "210mm".</summary>
    [JsonPropertyName("width")]
    public string? Width { get; set; }

    /// <summary>Paper height, e.g., "11in", "297mm".</summary>
    [JsonPropertyName("height")]
    public string? Height { get; set; }

    /// <summary>Print background graphics. Defaults to <c>false</c> on the service side.</summary>
    [JsonPropertyName("printBackground")]
    public bool? PrintBackground { get; set; }

    /// <summary>Landscape orientation.</summary>
    [JsonPropertyName("landscape")]
    public bool? Landscape { get; set; }

    /// <summary>Page ranges to print, e.g., "1-5, 8, 11-13".</summary>
    [JsonPropertyName("pageRanges")]
    public string? PageRanges { get; set; }

    /// <summary>Use CSS-defined page size.</summary>
    [JsonPropertyName("preferCSSPageSize")]
    public bool? PreferCssPageSize { get; set; }

    /// <summary>Display header and footer.</summary>
    [JsonPropertyName("displayHeaderFooter")]
    public bool? DisplayHeaderFooter { get; set; }

    /// <summary>HTML template for the print header.</summary>
    [JsonPropertyName("headerTemplate")]
    public string? HeaderTemplate { get; set; }

    /// <summary>HTML template for the print footer.</summary>
    [JsonPropertyName("footerTemplate")]
    public string? FooterTemplate { get; set; }

    /// <summary>Page margins.</summary>
    [JsonPropertyName("margin")]
    public PdfMargin? Margin { get; set; }
}
