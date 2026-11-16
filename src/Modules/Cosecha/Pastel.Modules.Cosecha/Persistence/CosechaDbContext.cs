using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Domain;

namespace Pastel.Modules.Cosecha.Persistence;

/// <summary>Contexto de Cosecha. Esquema <c>cosecha</c>, tablas y columnas en snake_case; sin claves foráneas hacia otros esquemas.</summary>
internal sealed class CosechaDbContext(DbContextOptions<CosechaDbContext> options) : DbContext(options)
{
    public const string Schema = "cosecha";

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<Producer> Producers => Set<Producer>();
    public DbSet<ProducerPhone> ProducerPhones => Set<ProducerPhone>();
    public DbSet<ProducerSeasonCapacity> ProducerCapacities => Set<ProducerSeasonCapacity>();
    public DbSet<Buyer> Buyers => Set<Buyer>();
    public DbSet<BuyerContact> BuyerContacts => Set<BuyerContact>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentOrder> ShipmentOrders => Set<ShipmentOrder>();
    public DbSet<ProducerDelivery> Deliveries => Set<ProducerDelivery>();
    public DbSet<ProducerPayment> Payments => Set<ProducerPayment>();
    public DbSet<ProducerPaymentAllocation> PaymentAllocations => Set<ProducerPaymentAllocation>();
    public DbSet<ChangeLogEntry> ChangeLog => Set<ChangeLogEntry>();
    public DbSet<PaymentPolicyVersion> PaymentPolicies => Set<PaymentPolicyVersion>();
    public DbSet<ClaimsPolicyVersion> ClaimsPolicies => Set<ClaimsPolicyVersion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.ApplyConfiguration(new Configurations.ProductConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.SeasonConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ProducerConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ProducerPhoneConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ProducerSeasonCapacityConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.BuyerConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.BuyerContactConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.OrderConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.OrderLineConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ShipmentConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ShipmentOrderConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ProducerDeliveryConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ProducerPaymentConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ProducerPaymentAllocationConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ChangeLogEntryConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.PaymentPolicyVersionConfiguration());
        modelBuilder.ApplyConfiguration(new Configurations.ClaimsPolicyVersionConfiguration());
    }
}
