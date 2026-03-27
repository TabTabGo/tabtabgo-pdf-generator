using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace TabTabGo.Service.Generator;

/// <summary>
/// Extension methods for registering the TabTabGo Generator client with the .NET dependency injection container.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="IGeneratorClient"/> (implemented by <see cref="GeneratorClient"/>)
    /// using values from the <c>GeneratorService</c> configuration section.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add services to.</param>
    /// <param name="configure">Optional delegate to configure <see cref="GeneratorOptions"/> in code.</param>
    /// <returns>The <see cref="IServiceCollection"/> so calls can be chained.</returns>
    /// <example>
    /// <code>
    /// // appsettings.json binding:
    /// builder.Services.AddGeneratorClient(
    ///     builder.Configuration.GetSection(GeneratorOptions.SectionName));
    ///
    /// // Or configure inline:
    /// builder.Services.AddGeneratorClient(opts =>
    /// {
    ///     opts.BaseUrl = "https://pdf.example.com";
    ///     opts.ApiKey  = "my-secret-key";
    /// });
    /// </code>
    /// </example>
    public static IServiceCollection AddGeneratorClient(
        this IServiceCollection services,
        Action<GeneratorOptions> configure)
    {
        ArgumentNullException.ThrowIfNull(configure);

        services.Configure(configure);
        RegisterServices(services);
        return services;
    }

    /// <summary>
    /// Registers <see cref="IGeneratorClient"/> (implemented by <see cref="GeneratorClient"/>)
    /// using an <see cref="IConfigurationSection"/> (e.g. from <c>appsettings.json</c>).
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add services to.</param>
    /// <param name="configuration">Configuration section to bind <see cref="GeneratorOptions"/> from.</param>
    /// <returns>The <see cref="IServiceCollection"/> so calls can be chained.</returns>
    public static IServiceCollection AddGeneratorClient(
        this IServiceCollection services,
        Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<GeneratorOptions>(configuration);
        RegisterServices(services);
        return services;
    }

    private static void RegisterServices(IServiceCollection services)
    {
        services
            .AddHttpClient<IGeneratorClient, GeneratorClient>();
    }
}
