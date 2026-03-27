namespace TabTabGo.Service.Generator;

/// <summary>
/// Exception thrown when the TabTabGo PDF Generator service returns a non-success HTTP response.
/// </summary>
public sealed class GeneratorServiceException : Exception
{
    /// <summary>HTTP status code returned by the service.</summary>
    public int StatusCode { get; }

    /// <summary>Raw response body returned by the service (may contain error details).</summary>
    public string? ResponseBody { get; }

    /// <summary>
    /// Initializes a new instance of <see cref="GeneratorServiceException"/>.
    /// </summary>
    public GeneratorServiceException(string message, int statusCode, string? responseBody = null)
        : base(message)
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }

    /// <summary>
    /// Initializes a new instance of <see cref="GeneratorServiceException"/> with an inner exception.
    /// </summary>
    public GeneratorServiceException(string message, int statusCode, string? responseBody, Exception innerException)
        : base(message, innerException)
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }
}
