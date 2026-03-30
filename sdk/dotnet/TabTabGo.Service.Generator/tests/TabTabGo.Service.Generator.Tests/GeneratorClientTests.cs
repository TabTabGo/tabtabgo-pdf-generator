using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using TabTabGo.Service.Generator;
using TabTabGo.Service.Generator.Models;
using Xunit;

namespace TabTabGo.Service.Generator.Tests;

public class GeneratorClientTests
{
    private const string BaseUrl = "https://pdf.example.com/";
    private const string ApiKey = "test-api-key";
    private const string PdfEndpoint = "v1/documents/pdf";

    private static (GeneratorClient client, Mock<HttpMessageHandler> handler) CreateClient(
        HttpResponseMessage response)
    {
        var handler = new Mock<HttpMessageHandler>();
        handler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);

        var httpClient = new HttpClient(handler.Object);

        var options = Options.Create(new GeneratorOptions
        {
            BaseUrl = BaseUrl,
            ApiKey = ApiKey
        });

        var client = new GeneratorClient(httpClient, options, NullLogger<GeneratorClient>.Instance);
        return (client, handler);
    }

    [Fact]
    public async Task GeneratePdfFromHtmlAsync_ReturnsBytes_OnSuccess()
    {
        var pdfBytes = Encoding.UTF8.GetBytes("%PDF-1.4 fake-pdf-content");
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(pdfBytes)
        };
        response.Content.Headers.ContentType = new("application/pdf");

        var (client, _) = CreateClient(response);

        var result = await client.GeneratePdfFromHtmlAsync("<html><body>Hello</body></html>");

        Assert.Equal(pdfBytes, result);
    }

    [Fact]
    public async Task GeneratePdfFromHtmlAsync_SendsApiKeyHeader()
    {
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // %PDF
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(pdfBytes)
        };

        var (client, handler) = CreateClient(response);

        await client.GeneratePdfFromHtmlAsync("<html/>");

        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(r =>
                r.Headers.Contains("x-api-key") &&
                r.Headers.GetValues("x-api-key").First() == ApiKey),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GeneratePdfFromHtmlAsync_SendsCorrectContentType()
    {
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 };
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(pdfBytes)
        };

        var (client, handler) = CreateClient(response);

        await client.GeneratePdfFromHtmlAsync("<html/>");

        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(r => RequestContainsContentType(r, "html")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GeneratePdfFromDocxAsync_SendsDocxContentType()
    {
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 };
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(pdfBytes)
        };

        var (client, handler) = CreateClient(response);

        await client.GeneratePdfFromDocxAsync("dGVzdA=="); // base64 "test"

        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(r => RequestContainsContentType(r, "docx")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GeneratePdfFromWordXmlAsync_SendsWordXmlContentType()
    {
        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 };
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(pdfBytes)
        };

        var (client, handler) = CreateClient(response);

        await client.GeneratePdfFromWordXmlAsync("<?xml?>");

        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(r => RequestContainsContentType(r, "word-xml")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GeneratePdfFromHtmlAsync_Throws_GeneratorServiceException_OnNonSuccessResponse()
    {
        var response = new HttpResponseMessage(HttpStatusCode.Unauthorized)
        {
            Content = new StringContent("{\"error\":\"Unauthorized\"}")
        };

        var (client, _) = CreateClient(response);

        var ex = await Assert.ThrowsAsync<GeneratorServiceException>(
            () => client.GeneratePdfFromHtmlAsync("<html/>"));

        Assert.Equal(401, ex.StatusCode);
    }

    [Fact]
    public void Constructor_Throws_WhenBaseUrlIsEmpty()
    {
        var options = Options.Create(new GeneratorOptions { BaseUrl = "", ApiKey = "key" });
        var httpClient = new HttpClient();

        Assert.Throws<InvalidOperationException>(
            () => new GeneratorClient(httpClient, options, NullLogger<GeneratorClient>.Instance));
    }

    [Fact]
    public void Constructor_Throws_WhenApiKeyIsEmpty()
    {
        var options = Options.Create(new GeneratorOptions { BaseUrl = BaseUrl, ApiKey = "" });
        var httpClient = new HttpClient();

        Assert.Throws<InvalidOperationException>(
            () => new GeneratorClient(httpClient, options, NullLogger<GeneratorClient>.Instance));
    }

    [Fact]
    public async Task GeneratePdfFromHtmlAsync_Throws_WhenContentIsNull()
    {
        var (client, _) = CreateClient(new HttpResponseMessage(HttpStatusCode.OK));

        await Assert.ThrowsAsync<ArgumentNullException>(
            () => client.GeneratePdfFromHtmlAsync(null!));
    }

    // --- helpers ---

    private static bool RequestContainsContentType(HttpRequestMessage request, string expectedContentType)
    {
        if (request.Content is null) return false;
        var json = request.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("contentType", out var ct) &&
               ct.GetString() == expectedContentType;
    }
}
