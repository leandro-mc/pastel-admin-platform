using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Domain;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Persistence;

/// <summary>
/// Único punto de entrada al perfil del propietario. Todo endpoint privado obtiene aquí el perfil de la cuenta de la
/// sesión (<see cref="ICurrentUser.UserId"/>) y filtra cada consulta por su <c>Id</c>: ningún identificador que llegue
/// en la ruta o en el cuerpo se usa sin comprobar que pertenece a ese perfil. Así un perfil ajeno responde 404, nunca
/// datos.
/// </summary>
internal sealed class OwnerProfiles(HuellaDbContext db, ICurrentUser currentUser, IClock clock)
{
    /// <summary>Devuelve el perfil del propietario; lo crea vacío (con su nota privada) la primera vez.</summary>
    public async Task<Result<Profile>> GetOrCreateAsync(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } ownerId)
        {
            return HuellaErrors.SessionRequired;
        }

        var existing = await db.Profiles.SingleOrDefaultAsync(p => p.OwnerUserId == ownerId, cancellationToken);
        if (existing is not null)
        {
            return existing;
        }

        var now = clock.UtcNow;
        var displayName = TextInput.CleanLine(currentUser.DisplayName);
        var profile = new Profile
        {
            Id = Guid.CreateVersion7(),
            OwnerUserId = ownerId,
            DisplayName = displayName.Length > HuellaLimits.Profile.DisplayName ? displayName[..HuellaLimits.Profile.DisplayName] : displayName,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Profiles.Add(profile);
        db.PrivateNotes.Add(new PrivateNote
        {
            Id = Guid.CreateVersion7(),
            ProfileId = profile.Id,
            PreferredPaper = "letter",
            UpdatedAt = now,
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return profile;
        }
        catch (DbUpdateException)
        {
            // Dos peticiones simultáneas crearon el perfil: el índice único de OwnerUserId conserva solo uno.
            db.ChangeTracker.Clear();
            var created = await db.Profiles.SingleOrDefaultAsync(p => p.OwnerUserId == ownerId, cancellationToken);
            if (created is null)
            {
                throw;
            }

            return created;
        }
    }

    /// <summary>Nota privada del perfil; se crea si falta (perfiles anteriores a esta tabla o datos reparados).</summary>
    public async Task<PrivateNote> GetNotesAsync(Profile profile, CancellationToken cancellationToken)
    {
        var notes = await db.PrivateNotes.SingleOrDefaultAsync(n => n.ProfileId == profile.Id, cancellationToken);
        if (notes is not null)
        {
            return notes;
        }

        notes = new PrivateNote
        {
            Id = Guid.CreateVersion7(),
            ProfileId = profile.Id,
            PreferredPaper = "letter",
            UpdatedAt = clock.UtcNow,
        };
        db.PrivateNotes.Add(notes);
        return notes;
    }

    /// <summary>Marca el borrador como modificado (lo usa «cambios sin publicar»).</summary>
    public void Touch(Profile profile) => profile.UpdatedAt = clock.UtcNow;
}
