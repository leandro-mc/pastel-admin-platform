using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Bank;

/// <summary>
/// Reglas puras del respaldo (sin base de datos, con prueba): qué documento se acepta y cómo se reconcilian los
/// identificadores del archivo con los del banco que ya existe.
/// </summary>
internal static class BankBackupRules
{
    public const string FormatName = "pastel-huella-bank";
    public const int CurrentVersion = 1;

    /// <summary>Comprueba el sobre del documento. Devuelve el error, o <c>null</c> si se puede intentar importar.</summary>
    public static Error? CheckEnvelope(BankBackup? file)
    {
        if (file is null || !string.Equals(file.Format, FormatName, StringComparison.Ordinal) || file.Bank is null)
        {
            return HuellaErrors.BankBackupNotRecognized;
        }

        if (file.Version is not { } version || version < 1)
        {
            return HuellaErrors.BankBackupNotRecognized;
        }

        return version > CurrentVersion ? HuellaErrors.BankBackupTooNew : null;
    }

    /// <summary>
    /// Qué <c>Id</c> se envía a un guardado por sección. <paramref name="usable"/> son los ids de este perfil más los del
    /// archivo que no existen en ninguna fila: un id así se conserva (la fila se actualiza, o se crea con ese mismo id, y lo
    /// que la cita sigue valiendo). Cualquier otro —de otro perfil, repetido o escrito a mano— se descarta y el servidor crea
    /// la fila con un id nuevo. Así importar nunca responde 404 por un id ajeno ni toca filas de otro perfil.
    /// </summary>
    public static Guid? KeepId(Guid? id, IReadOnlySet<Guid> usable, ISet<Guid> used) =>
        id is { } value && usable.Contains(value) && used.Add(value) ? value : null;

    /// <summary>Todos los ids que trae el archivo (habilidades, secciones, experiencias, proyectos y sus logros), sin repetir.</summary>
    public static HashSet<Guid> FileIds(BankBackupData data)
    {
        var ids = new HashSet<Guid>();

        void Add(Guid? id)
        {
            if (id is { } value)
            {
                ids.Add(value);
            }
        }

        foreach (var x in data.Skills ?? [])
        {
            Add(x.Id);
        }

        foreach (var x in data.Competencies ?? [])
        {
            Add(x.Id);
        }

        foreach (var x in data.Educations ?? [])
        {
            Add(x.Id);
        }

        foreach (var x in data.Certifications ?? [])
        {
            Add(x.Id);
        }

        foreach (var x in data.Languages ?? [])
        {
            Add(x.Id);
        }

        foreach (var x in data.Experiences ?? [])
        {
            Add(x.Id);
            foreach (var a in x.Achievements ?? [])
            {
                Add(a.Id);
            }
        }

        foreach (var x in data.Projects ?? [])
        {
            Add(x.Id);
            foreach (var a in x.Achievements ?? [])
            {
                Add(a.Id);
            }
        }

        return ids;
    }

    /// <summary>
    /// Traduce las habilidades que cita un logro (ids del archivo) a las ids que quedaron en el banco. Devuelve
    /// <c>false</c> si alguna no está en el archivo: se rechaza todo, no se guarda un logro con una cita perdida.
    /// </summary>
    public static bool TryMapSkills(IReadOnlyList<Guid>? ids, IReadOnlyDictionary<Guid, Guid> map, out List<Guid> mapped)
    {
        mapped = [];
        foreach (var id in ids ?? [])
        {
            if (!map.TryGetValue(id, out var target))
            {
                return false;
            }

            if (!mapped.Contains(target))
            {
                mapped.Add(target);
            }
        }

        return true;
    }
}
