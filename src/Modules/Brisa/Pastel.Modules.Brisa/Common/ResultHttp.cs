using Microsoft.AspNetCore.Http;
using Pastel.Platform.Errors;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Common;

/// <summary>Traduce un <see cref="Result{T}"/> a la respuesta HTTP: valor con el estado indicado, o <c>problem+json</c>.</summary>
internal static class ResultHttp
{
    public static IResult ToResponse<T>(this Result<T> result, HttpContext http, int statusCode = StatusCodes.Status200OK) =>
        result.IsFailure ? PastelProblem.From(result.Error, http) : Results.Json(result.Value, statusCode: statusCode);
}
