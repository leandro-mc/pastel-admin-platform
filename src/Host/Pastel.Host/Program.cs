using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

// La composición vive en Pastel.Platform y en cada módulo; aquí solo se encadenan las llamadas (hallazgo B2).
var builder = WebApplication.CreateBuilder(args);

builder.AddPastelObservability();
builder.AddPastelSecurity();
builder.AddPastelModules();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UsePastelPipeline();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymousExplicit();
}

app.MapPastelEndpoints();
await app.InitializePastelAsync(app.Lifetime.ApplicationStopping);
await app.RunAsync();

/// <summary>Punto de entrada accesible para las pruebas de integración (<c>WebApplicationFactory&lt;Program&gt;</c>).</summary>
public partial class Program;
