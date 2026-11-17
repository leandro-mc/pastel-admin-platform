using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Features.CreateTask;
using Pastel.Modules.Brisa.Features.DeleteTask;
using Pastel.Modules.Brisa.Features.Import;
using Pastel.Modules.Brisa.Features.ListTasks;
using Pastel.Modules.Brisa.Features.SetCompleted;
using Pastel.Modules.Brisa.Features.Settings;
using Pastel.Modules.Brisa.Features.UndoChange;
using Pastel.Modules.Brisa.Features.UpdateTask;

namespace Pastel.Modules.Brisa.Features;

/// <summary>Registro de handlers y montaje de rutas bajo <c>/api/brisa</c>.</summary>
internal static class BrisaEndpoints
{
    public static IServiceCollection AddBrisaFeatures(this IServiceCollection services)
    {
        services.AddScoped<PersonContext>();
        services.AddScoped<ListTasksHandler>();
        services.AddScoped<CreateTaskHandler>();
        services.AddScoped<UpdateTaskHandler>();
        services.AddScoped<SetCompletedHandler>();
        services.AddScoped<DeleteTaskHandler>();
        services.AddScoped<UndoChangeHandler>();
        services.AddScoped<SettingsHandler>();
        services.AddScoped<ImportTasksHandler>();
        services.AddScoped<ImportBatchesHandler>();
        return services;
    }

    public static void Map(IEndpointRouteBuilder api)
    {
        var tasks = api.MapGroup("/tasks");
        ListTasksEndpoint.Map(tasks);
        CreateTaskEndpoint.Map(tasks);
        UpdateTaskEndpoint.Map(tasks);
        SetCompletedEndpoint.Map(tasks);
        DeleteTaskEndpoint.Map(tasks);

        UndoChangeEndpoint.Map(api.MapGroup("/undo"));
        SettingsEndpoint.Map(api.MapGroup("/settings"));
        ImportEndpoint.Map(api.MapGroup("/import"));
    }
}
