namespace Pastel.SharedKernel;

/// <summary>Solicitud de página ya normalizada: página desde 1 y tamaño entre 1 y <see cref="MaxPageSize"/>.</summary>
public sealed record PageRequest(int Page, int PageSize)
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public int Skip => (Page - 1) * PageSize;

    public static PageRequest Normalize(int? page, int? pageSize) =>
        new(Math.Max(page ?? 1, 1), Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize));
}

/// <summary>Página de resultados con el total para poder paginar en el cliente.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
