namespace TabTabGo.Service.Generator;

/// <summary>
/// Configuration options for the TabTabGo PDF Generator service client.
/// </summary>
public class GeneratorOptions
{
    /// <summary>
    /// The configuration section name used when binding from appsettings.json.
    /// </summary>
    public const string SectionName = "GeneratorService";

    /// <summary>
    /// The base URL of the TabTabGo PDF Generator service (e.g., "https://pdf.example.com").
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// The API key used to authenticate requests to the PDF Generator service.
    /// This value is sent as the <c>x-api-key</c> request header.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// The HTTP request timeout. Defaults to 30 seconds.
    /// </summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);
}
