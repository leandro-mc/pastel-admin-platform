using System.Net.Sockets;
using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using Pastel.Platform.Observability;
using Pastel.SharedKernel;

namespace Pastel.Platform.Errors;

/// <summary>
/// Asocia una violación de índice único con el campo que ve la persona usuaria, sin exponer el nombre del índice.
/// Cada módulo registra sus fragmentos de índice al configurar servicios.
/// </summary>
public sealed class UniqueViolationMap
{
    private readonly List<(string Fragment, string Field, string Message)> _entries = [];

    public void Register(string constraintFragment, string field, string message) =>
        _entries.Add((constraintFragment, field, message));

    internal Error Translate(string? constraintName)
    {
        foreach (var (fragment, field, message) in _entries)
        {
            if (constraintName?.Contains(fragment, StringComparison.OrdinalIgnoreCase) == true)
            {
                return Error.Conflict(
                    PlatformErrors.Duplicate.Code, message,
                    new Dictionary<string, string[]> { [field] = [message] });
            }
        }

        return PlatformErrors.Duplicate;
    }
}

/// <summary>Un módulo implementa esto para registrar sus índices únicos en el <see cref="UniqueViolationMap"/> (se resuelve al crear el mapa).</summary>
public interface IUniqueViolationSource
{
    void Register(UniqueViolationMap map);
}

/// <summary>Único traductor de excepciones a respuestas. Nunca devuelve <c>ex.Message</c>.</summary>
internal sealed class PastelExceptionHandler(ILogger<PastelExceptionHandler> logger, UniqueViolationMap uniqueMap) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            logger.LogDebug("La persona cerró la conexión antes de terminar {Path}", httpContext.Request.Path.Value);
            httpContext.Response.StatusCode = 499;
            return true;
        }

        if (httpContext.Response.HasStarted)
        {
            logger.LogError(PastelEventIds.UnhandledError, exception, "Fallo tras iniciar la respuesta en {Path}", httpContext.Request.Path.Value);
            return false;
        }

        var error = Translate(exception);
        await PastelProblem.From(error, httpContext, exception).ExecuteAsync(httpContext);
        return true;
    }

    private Error Translate(Exception exception)
    {
        var postgres = FindPostgres(exception);
        if (postgres is not null)
        {
            switch (postgres.SqlState)
            {
                case PostgresErrorCodes.UniqueViolation:
                    return uniqueMap.Translate(postgres.ConstraintName);
                case PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected:
                    return PlatformErrors.Unavailable(retryAfterSeconds: 1);
            }
        }

        return exception switch
        {
            DbUpdateConcurrencyException => PlatformErrors.ConcurrencyConflict,
            BadHttpRequestException or JsonException => PlatformErrors.ValidationFailed,
            _ when IsConnectivityProblem(exception) => PlatformErrors.Unavailable(),
            _ => PlatformErrors.Unexpected,
        };
    }

    internal static PostgresException? FindPostgres(Exception? exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException pg)
            {
                return pg;
            }
        }

        return null;
    }

    private static bool IsConnectivityProblem(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is SocketException or TimeoutException || current is NpgsqlException { IsTransient: true })
            {
                return true;
            }
        }

        return false;
    }
}
