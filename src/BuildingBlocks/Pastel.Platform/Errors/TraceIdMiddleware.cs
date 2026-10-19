using Microsoft.AspNetCore.Http;

namespace Pastel.Platform.Errors;

/// <summary>Agrega <c>X-Trace-Id</c> a toda respuesta para que el soporte pueda buscar la petición en los registros.</summary>
internal sealed class TraceIdMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[PastelProblem.TraceHeader] = PastelProblem.TraceId(context);
            return Task.CompletedTask;
        });
        return next(context);
    }
}
