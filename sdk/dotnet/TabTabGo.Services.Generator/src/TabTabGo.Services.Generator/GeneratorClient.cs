using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TabTabGo.Services.Generator.Models;

namespace TabTabGo.Services.Generator;

/// <summary>
/// HTTP client for the TabTabGo PDF Generator service.
/// Handles authentication, serialization, and error handling automatically.
/// </summary>
public sealed class GeneratorClient : IGeneratorClient
{
    private const string PdfEndpoint = "v1/documents/pdf";
    private const string ApiKeyHeader = "x-api-key";

    private readonly HttpClient _httpClient;
    private readonly ILogger<GeneratorClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Initializes a new instance of <see cref="GeneratorClient"/>.
    /// </summary>
    /// <param name="httpClient">
    /// Named/typed <see cref="HttpClient"/> configured by
    /// <see cref="ServiceCollectionExtensions.AddGeneratorClient(Microsoft.Extensions.DependencyInjection.IServiceCollection, Action{GeneratorOptions})"/>.
    /// </param>
    /// <param name="options">Resolved <see cref="GeneratorOptions"/>.</param>
    /// <param name="logger">Logger instance.</param>
    public GeneratorClient(
        HttpClient httpClient,
        IOptions<GeneratorOptions> options,
        ILogger<GeneratorClient> logger)
    {
        ArgumentNullException.ThrowIfNull(httpClient);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(logger);

        _httpClient = httpClient;
        _logger = logger;

        var generatorOptions = options.Value;

        if (string.IsNullOrWhiteSpace(generatorOptions.BaseUrl))
            throw new InvalidOperationException(
                $"{nameof(GeneratorOptions.BaseUrl)} must be configured in {GeneratorOptions.SectionName}.");

        if (string.IsNullOrWhiteSpace(generatorOptions.ApiKey))
            throw new InvalidOperationException(
                $"{nameof(GeneratorOptions.ApiKey)} must be configured in {GeneratorOptions.SectionName}.");

        // Ensure BaseUrl ends with a slash so relative paths resolve correctly.
        _httpClient.BaseAddress = new Uri(
            generatorOptions.BaseUrl.TrimEnd('/') + '/',
            UriKind.Absolute);

        _httpClient.DefaultRequestHeaders.Add(ApiKeyHeader, generatorOptions.ApiKey);
        _httpClient.Timeout = generatorOptions.Timeout;
    }

    /// <inheritdoc/>
    public Task<byte[]> GeneratePdfAsync(
        string contentType,
        string content,
        PdfOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        return SendPdfRequestAsync(contentType, content, options, cancellationToken);
    }

    /// <inheritdoc/>
    public Task<byte[]> GeneratePdfFromHtmlAsync(
        string htmlContent,
        PdfOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(htmlContent);
        return SendPdfRequestAsync("html", htmlContent, options, cancellationToken);
    }

    /// <inheritdoc/>
    public Task<byte[]> GeneratePdfFromDocxAsync(
        string docxBase64,
        PdfOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(docxBase64);
        return SendPdfRequestAsync("docx", docxBase64, options, cancellationToken);
    }

    /// <inheritdoc/>
    public Task<byte[]> GeneratePdfFromWordXmlAsync(
        string wordXml,
        PdfOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(wordXml);
        return SendPdfRequestAsync("word-xml", wordXml, options, cancellationToken);
    }

    private async Task<byte[]> SendPdfRequestAsync(
        string contentType,
        string content,
        PdfOptions? options,
        CancellationToken cancellationToken)
    {
        var request = new PdfRequest
        {
            ContentType = contentType,
            Content = content,
            Options = options
        };

        _logger.LogDebug(
            "Sending PDF generation request. ContentType={ContentType}",
            contentType);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync(PdfEndpoint, request, JsonOptions, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            _logger.LogError(ex,
                "HTTP request to PDF generator service failed. ContentType={ContentType}",
                contentType);
            throw;
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "PDF generator service returned an error. StatusCode={StatusCode} Body={Body}",
                (int)response.StatusCode,
                errorBody);

            throw new GeneratorServiceException(
                $"PDF generator service returned {(int)response.StatusCode} {response.ReasonPhrase}.",
                (int)response.StatusCode,
                errorBody);
        }

        var pdfBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);

        _logger.LogDebug(
            "PDF generation succeeded. ContentType={ContentType} Size={Size} bytes",
            contentType,
            pdfBytes.Length);

        return pdfBytes;
    }
}
