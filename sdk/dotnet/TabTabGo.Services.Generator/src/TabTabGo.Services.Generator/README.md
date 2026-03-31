# TabTabGo.Services.Generator

A .NET 8 SDK for the [TabTabGo PDF Generator](https://github.com/TabTabGo/tabtabgo-pdf-generator) service.

Instead of writing raw `HttpClient` calls, handling API-key headers, serialization, and logging yourself, this package provides a strongly-typed client that does it all for you.

## Installation

```bash
dotnet add package TabTabGo.Services.Generator
```

## Configuration

### appsettings.json

```json
{
  "GeneratorService": {
    "BaseUrl": "https://your-pdf-generator-host",
    "ApiKey": "your-api-key",
    "Timeout": "00:00:30"
  }
}
```

### Program.cs / Startup.cs

```csharp
// Bind from configuration section (recommended for production)
builder.Services.AddGeneratorClient(
    builder.Configuration.GetSection(GeneratorOptions.SectionName));

// Or configure inline (useful for testing / simple apps)
builder.Services.AddGeneratorClient(opts =>
{
    opts.BaseUrl = "https://your-pdf-generator-host";
    opts.ApiKey  = "your-api-key";
});
```

## Usage

Inject `IGeneratorClient` wherever you need it:

```csharp
public class MyService
{
    private readonly IGeneratorClient _generator;

    public MyService(IGeneratorClient generator)
    {
        _generator = generator;
    }

    // HTML → PDF
    public async Task<byte[]> HtmlToPdfAsync(string html)
    {
        return await _generator.GeneratePdfFromHtmlAsync(html, new PdfOptions
        {
            Format = "A4",
            PrintBackground = true,
            Margin = new PdfMargin { Top = "1cm", Bottom = "1cm", Left = "1cm", Right = "1cm" }
        });
    }

    // DOCX → PDF  (pass the file as base64)
    public async Task<byte[]> DocxToPdfAsync(byte[] docxBytes)
    {
        var base64 = Convert.ToBase64String(docxBytes);
        return await _generator.GeneratePdfFromDocxAsync(base64);
    }

    // Word XML → PDF
    public async Task<byte[]> WordXmlToPdfAsync(string wordXml)
    {
        return await _generator.GeneratePdfFromWordXmlAsync(wordXml);
    }
}
```

## PDF Options

All `PdfOptions` properties are optional:

| Property | Type | Description |
|---|---|---|
| `Format` | `string?` | Paper format: `"A4"`, `"Letter"`, etc. |
| `Width` | `string?` | Paper width, e.g. `"210mm"` |
| `Height` | `string?` | Paper height, e.g. `"297mm"` |
| `PrintBackground` | `bool?` | Include background graphics |
| `Landscape` | `bool?` | Landscape orientation |
| `PageRanges` | `string?` | Page ranges, e.g. `"1-5, 8"` |
| `PreferCssPageSize` | `bool?` | Use CSS-defined page size |
| `DisplayHeaderFooter` | `bool?` | Show header/footer |
| `HeaderTemplate` | `string?` | HTML header template |
| `FooterTemplate` | `string?` | HTML footer template |
| `Margin` | `PdfMargin?` | Page margins (`Top`, `Right`, `Bottom`, `Left`) |

## Error Handling

If the service returns a non-success HTTP response, a `GeneratorServiceException` is thrown:

```csharp
try
{
    var pdf = await _generator.GeneratePdfFromHtmlAsync(html);
}
catch (GeneratorServiceException ex)
{
    Console.WriteLine($"Service error {ex.StatusCode}: {ex.ResponseBody}");
}
```

## License

ISC
