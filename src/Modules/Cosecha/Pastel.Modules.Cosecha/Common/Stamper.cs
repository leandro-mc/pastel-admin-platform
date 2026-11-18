using Pastel.Modules.Cosecha.Domain;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Common;

/// <summary>Sella quién y cuándo crea o modifica un registro, con la hora del <see cref="IClock"/> y la persona de la sesión.</summary>
internal sealed class Stamper(IClock clock, ICurrentUser currentUser)
{
    public DateTimeOffset Now => clock.UtcNow;

    public Guid? UserId => currentUser.UserId;

    public string? UserName => currentUser.DisplayName;

    public T Created<T>(T entity)
        where T : IAudited
    {
        entity.CreatedAt = Now;
        entity.CreatedBy = UserId;
        Updated(entity);
        return entity;
    }

    public void Updated(IAudited entity)
    {
        entity.UpdatedAt = Now;
        entity.UpdatedBy = UserId;
    }
}
