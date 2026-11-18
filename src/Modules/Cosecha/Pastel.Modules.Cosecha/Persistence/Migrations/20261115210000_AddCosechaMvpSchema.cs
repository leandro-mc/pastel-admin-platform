using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Pastel.Modules.Cosecha.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCosechaMvpSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "cosecha");

            migrationBuilder.CreateTable(
                name: "products",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    unit = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_products", x => x.id);
                    table.CheckConstraint("ck_products_unit", "unit IN ('kg')");
                });

            migrationBuilder.CreateTable(
                name: "seasons",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    starts_on = table.Column<DateOnly>(type: "date", nullable: false),
                    ends_on = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    default_producer_price_per_kg = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_seasons", x => x.id);
                    table.ForeignKey(
                        name: "fk_seasons_products",
                        column: x => x.product_id,
                        principalSchema: "cosecha",
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_seasons_dates", "ends_on >= starts_on");
                    table.CheckConstraint("ck_seasons_status", "status IN ('Active', 'Closed')");
                    table.CheckConstraint("ck_seasons_price", "default_producer_price_per_kg >= 0");
                });

            migrationBuilder.CreateTable(
                name: "producers",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    pickup_point = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    latitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    longitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    map_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    archived_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_producers", x => x.id);
                    table.CheckConstraint("ck_producers_location", "(latitude IS NULL) = (longitude IS NULL) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))");
                });

            migrationBuilder.CreateTable(
                name: "producer_phones",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    producer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    phone = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    label = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_producer_phones", x => x.id);
                    table.ForeignKey(
                        name: "fk_producer_phones_producers",
                        column: x => x.producer_id,
                        principalSchema: "cosecha",
                        principalTable: "producers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.CheckConstraint("ck_producer_phones_format", "phone ~ '^[0-9]{8}$'");
                });

            migrationBuilder.CreateTable(
                name: "producer_season_capacities",
                schema: "cosecha",
                columns: table => new
                {
                    producer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    season_id = table.Column<Guid>(type: "uuid", nullable: false),
                    estimated_capacity_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_producer_season_capacities", x => new { x.producer_id, x.season_id });
                    table.ForeignKey(
                        name: "fk_producer_season_capacities_producers",
                        column: x => x.producer_id,
                        principalSchema: "cosecha",
                        principalTable: "producers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_producer_season_capacities_seasons",
                        column: x => x.season_id,
                        principalSchema: "cosecha",
                        principalTable: "seasons",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_producer_season_capacities_kg", "estimated_capacity_kg >= 0");
                });

            migrationBuilder.CreateTable(
                name: "buyers",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    zone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    latitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    longitude = table.Column<decimal>(type: "numeric(9,6)", precision: 9, scale: 6, nullable: true),
                    map_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    delivery_conditions = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    archived_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_buyers", x => x.id);
                    table.CheckConstraint("ck_buyers_location", "(latitude IS NULL) = (longitude IS NULL) AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))");
                });

            migrationBuilder.CreateTable(
                name: "buyer_contacts",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    buyer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    phone = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    role_title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_buyer_contacts", x => x.id);
                    table.ForeignKey(
                        name: "fk_buyer_contacts_buyers",
                        column: x => x.buyer_id,
                        principalSchema: "cosecha",
                        principalTable: "buyers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.CheckConstraint("ck_buyer_contacts_phone", "phone IS NULL OR phone ~ '^[0-9]{8}$'");
                });

            migrationBuilder.CreateTable(
                name: "orders",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    buyer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    season_id = table.Column<Guid>(type: "uuid", nullable: false),
                    required_on = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    cancelled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    cancel_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_orders", x => x.id);
                    table.ForeignKey(
                        name: "fk_orders_buyers",
                        column: x => x.buyer_id,
                        principalSchema: "cosecha",
                        principalTable: "buyers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_orders_seasons",
                        column: x => x.season_id,
                        principalSchema: "cosecha",
                        principalTable: "seasons",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_orders_status", "status IN ('Draft', 'Confirmed', 'Cancelled')");
                    table.CheckConstraint("ck_orders_cancelled", "(status = 'Cancelled') = (cancelled_at IS NOT NULL)");
                });

            migrationBuilder.CreateTable(
                name: "order_lines",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kilograms = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    price_per_kg = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_order_lines", x => x.id);
                    table.ForeignKey(
                        name: "fk_order_lines_orders",
                        column: x => x.order_id,
                        principalSchema: "cosecha",
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_order_lines_products",
                        column: x => x.product_id,
                        principalSchema: "cosecha",
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_order_lines_kg", "kilograms > 0");
                    table.CheckConstraint("ck_order_lines_price", "price_per_kg >= 0");
                });

            migrationBuilder.CreateTable(
                name: "shipments",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    season_id = table.Column<Guid>(type: "uuid", nullable: false),
                    shipment_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    buffer_percent = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    close_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_shipments", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipments_seasons",
                        column: x => x.season_id,
                        principalSchema: "cosecha",
                        principalTable: "seasons",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_shipments_status", "status IN ('Planned', 'Collecting', 'Collected', 'Delivered', 'Closed')");
                    table.CheckConstraint("ck_shipments_buffer", "buffer_percent BETWEEN 0 AND 100");
                });

            migrationBuilder.CreateTable(
                name: "shipment_orders",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    planned_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    delivered_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    delivery_note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    delivered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_shipment_orders", x => x.id);
                    table.ForeignKey(
                        name: "fk_shipment_orders_shipments",
                        column: x => x.shipment_id,
                        principalSchema: "cosecha",
                        principalTable: "shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_shipment_orders_orders",
                        column: x => x.order_id,
                        principalSchema: "cosecha",
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_shipment_orders_planned", "planned_kg >= 0");
                    table.CheckConstraint("ck_shipment_orders_delivered", "delivered_kg IS NULL OR delivered_kg >= 0");
                });

            migrationBuilder.CreateTable(
                name: "producer_deliveries",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    shipment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    producer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    requested_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    available_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    received_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    rejected_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    accepted_kg = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true, computedColumnSql: "received_kg - rejected_kg", stored: true),
                    price_per_kg = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    amount_crc = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true, computedColumnSql: "round((received_kg - rejected_kg) * price_per_kg, 2)", stored: true),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    quality = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    expected_payment_date = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_producer_deliveries", x => x.id);
                    table.ForeignKey(
                        name: "fk_producer_deliveries_shipments",
                        column: x => x.shipment_id,
                        principalSchema: "cosecha",
                        principalTable: "shipments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_producer_deliveries_producers",
                        column: x => x.producer_id,
                        principalSchema: "cosecha",
                        principalTable: "producers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_producer_deliveries_status", "status IN ('Requested', 'Confirmed', 'Received', 'NoDelivery')");
                    table.CheckConstraint("ck_producer_deliveries_quality", "quality IS NULL OR quality IN ('Good', 'WithObservations', 'Bad')");
                    table.CheckConstraint("ck_producer_deliveries_kg", "requested_kg >= 0 AND (available_kg IS NULL OR available_kg >= 0) AND (received_kg IS NULL OR received_kg >= 0) AND rejected_kg >= 0");
                    table.CheckConstraint("ck_producer_deliveries_rejected", "rejected_kg = 0 OR (received_kg IS NOT NULL AND rejected_kg <= received_kg)");
                    table.CheckConstraint("ck_producer_deliveries_received", "status <> 'Received' OR received_kg IS NOT NULL");
                    table.CheckConstraint("ck_producer_deliveries_price", "price_per_kg >= 0");
                });

            migrationBuilder.CreateTable(
                name: "producer_payments",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    producer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    paid_on = table.Column<DateOnly>(type: "date", nullable: false),
                    amount_crc = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    method = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    voided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    voided_by = table.Column<Guid>(type: "uuid", nullable: true),
                    void_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_producer_payments", x => x.id);
                    table.ForeignKey(
                        name: "fk_producer_payments_producers",
                        column: x => x.producer_id,
                        principalSchema: "cosecha",
                        principalTable: "producers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_producer_payments_amount", "amount_crc > 0");
                    table.CheckConstraint("ck_producer_payments_method", "method IN ('Cash', 'Sinpe', 'Transfer')");
                    table.CheckConstraint("ck_producer_payments_void", "(voided_at IS NULL) = (void_reason IS NULL)");
                });

            migrationBuilder.CreateTable(
                name: "producer_payment_allocations",
                schema: "cosecha",
                columns: table => new
                {
                    payment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delivery_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount_crc = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_producer_payment_allocations", x => new { x.payment_id, x.delivery_id });
                    table.ForeignKey(
                        name: "fk_producer_payment_allocations_payments",
                        column: x => x.payment_id,
                        principalSchema: "cosecha",
                        principalTable: "producer_payments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_producer_payment_allocations_deliveries",
                        column: x => x.delivery_id,
                        principalSchema: "cosecha",
                        principalTable: "producer_deliveries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.CheckConstraint("ck_producer_payment_allocations_amount", "amount_crc > 0");
                });

            migrationBuilder.CreateTable(
                name: "change_log_entries",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    entity_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    field = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    old_value = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    new_value = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    changed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    changed_by_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    changed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_change_log_entries", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "payment_policy_versions",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    advance_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    reference_price_per_kg = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    grade_bweight_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    fund_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    management_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    max_advance_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    payment_weekday = table.Column<short>(type: "smallint", nullable: true),
                    ratified = table.Column<bool>(type: "boolean", nullable: false),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payment_policy_versions", x => x.id);
                    table.CheckConstraint("ck_payment_policy_versions_pct", "(advance_pct IS NULL OR advance_pct BETWEEN 0 AND 100) AND (grade_bweight_pct IS NULL OR grade_bweight_pct BETWEEN 0 AND 100) AND (fund_pct IS NULL OR fund_pct BETWEEN 0 AND 100) AND (management_pct IS NULL OR management_pct BETWEEN 0 AND 100) AND (max_advance_pct IS NULL OR max_advance_pct BETWEEN 0 AND 100)");
                    table.CheckConstraint("ck_payment_policy_versions_price", "reference_price_per_kg IS NULL OR reference_price_per_kg >= 0");
                    table.CheckConstraint("ck_payment_policy_versions_weekday", "payment_weekday IS NULL OR payment_weekday BETWEEN 1 AND 7");
                });

            migrationBuilder.CreateTable(
                name: "claims_policy_versions",
                schema: "cosecha",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    claim_window_hours = table.Column<int>(type: "integer", nullable: true),
                    required_photos = table.Column<short>(type: "smallint", nullable: true),
                    tolerance_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    major_claim_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    credit_pct_rot = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    credit_pct_discoloration = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    ack_hours = table.Column<int>(type: "integer", nullable: true),
                    resolution_days = table.Column<int>(type: "integer", nullable: true),
                    major_resolution_days = table.Column<int>(type: "integer", nullable: true),
                    ratified = table.Column<bool>(type: "boolean", nullable: false),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_claims_policy_versions", x => x.id);
                    table.CheckConstraint("ck_claims_policy_versions_pct", "(tolerance_pct IS NULL OR tolerance_pct BETWEEN 0 AND 100) AND (major_claim_pct IS NULL OR major_claim_pct BETWEEN 0 AND 100) AND (credit_pct_rot IS NULL OR credit_pct_rot BETWEEN 0 AND 100) AND (credit_pct_discoloration IS NULL OR credit_pct_discoloration BETWEEN 0 AND 100)");
                    table.CheckConstraint("ck_claims_policy_versions_counts", "(claim_window_hours IS NULL OR claim_window_hours > 0) AND (required_photos IS NULL OR required_photos >= 0) AND (ack_hours IS NULL OR ack_hours > 0) AND (resolution_days IS NULL OR resolution_days > 0) AND (major_resolution_days IS NULL OR major_resolution_days > 0)");
                });

            migrationBuilder.CreateIndex(
                name: "ux_products_normalized_name",
                schema: "cosecha",
                table: "products",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_seasons_normalized_name",
                schema: "cosecha",
                table: "seasons",
                column: "normalized_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_seasons_product_id",
                schema: "cosecha",
                table: "seasons",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_seasons_status",
                schema: "cosecha",
                table: "seasons",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_producers_normalized_name",
                schema: "cosecha",
                table: "producers",
                column: "normalized_name");

            migrationBuilder.CreateIndex(
                name: "ix_producers_user_id",
                schema: "cosecha",
                table: "producers",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_producer_phones_producer_phone",
                schema: "cosecha",
                table: "producer_phones",
                columns: new[] { "producer_id", "phone" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_producer_phones_primary",
                schema: "cosecha",
                table: "producer_phones",
                column: "producer_id",
                unique: true,
                filter: "is_primary");

            migrationBuilder.CreateIndex(
                name: "ix_producer_season_capacities_season_id",
                schema: "cosecha",
                table: "producer_season_capacities",
                column: "season_id");

            migrationBuilder.CreateIndex(
                name: "ix_buyers_normalized_name",
                schema: "cosecha",
                table: "buyers",
                column: "normalized_name");

            migrationBuilder.CreateIndex(
                name: "ix_buyers_user_id",
                schema: "cosecha",
                table: "buyers",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_buyer_contacts_buyer_id",
                schema: "cosecha",
                table: "buyer_contacts",
                column: "buyer_id");

            migrationBuilder.CreateIndex(
                name: "ux_buyer_contacts_primary",
                schema: "cosecha",
                table: "buyer_contacts",
                column: "buyer_id",
                unique: true,
                filter: "is_primary");

            migrationBuilder.CreateIndex(
                name: "ix_orders_season_required_on",
                schema: "cosecha",
                table: "orders",
                columns: new[] { "season_id", "required_on" });

            migrationBuilder.CreateIndex(
                name: "ix_orders_buyer_id",
                schema: "cosecha",
                table: "orders",
                column: "buyer_id");

            migrationBuilder.CreateIndex(
                name: "ix_orders_status",
                schema: "cosecha",
                table: "orders",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ux_order_lines_order_product",
                schema: "cosecha",
                table: "order_lines",
                columns: new[] { "order_id", "product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_order_lines_product_id",
                schema: "cosecha",
                table: "order_lines",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_shipments_season_date",
                schema: "cosecha",
                table: "shipments",
                columns: new[] { "season_id", "shipment_date" });

            migrationBuilder.CreateIndex(
                name: "ix_shipments_status",
                schema: "cosecha",
                table: "shipments",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ux_shipment_orders_shipment_order",
                schema: "cosecha",
                table: "shipment_orders",
                columns: new[] { "shipment_id", "order_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_shipment_orders_order_id",
                schema: "cosecha",
                table: "shipment_orders",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ux_producer_deliveries_shipment_producer",
                schema: "cosecha",
                table: "producer_deliveries",
                columns: new[] { "shipment_id", "producer_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_producer_deliveries_producer_id",
                schema: "cosecha",
                table: "producer_deliveries",
                column: "producer_id");

            migrationBuilder.CreateIndex(
                name: "ix_producer_deliveries_expected_payment_date",
                schema: "cosecha",
                table: "producer_deliveries",
                column: "expected_payment_date");

            migrationBuilder.CreateIndex(
                name: "ix_producer_payments_producer_paid_on",
                schema: "cosecha",
                table: "producer_payments",
                columns: new[] { "producer_id", "paid_on" });

            migrationBuilder.CreateIndex(
                name: "ix_producer_payment_allocations_delivery_id",
                schema: "cosecha",
                table: "producer_payment_allocations",
                column: "delivery_id");

            migrationBuilder.CreateIndex(
                name: "ix_change_log_entries_entity",
                schema: "cosecha",
                table: "change_log_entries",
                columns: new[] { "entity_type", "entity_id", "changed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_payment_policy_versions_effective_from",
                schema: "cosecha",
                table: "payment_policy_versions",
                column: "effective_from");

            migrationBuilder.CreateIndex(
                name: "ix_claims_policy_versions_effective_from",
                schema: "cosecha",
                table: "claims_policy_versions",
                column: "effective_from");

            // Integridad que EF no modela: se declara en SQL y se prueba en una base real.
            migrationBuilder.Sql(@"CREATE FUNCTION cosecha.forbid_modification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'La tabla % solo admite agregar filas.', TG_TABLE_NAME USING ERRCODE = '23514';
END;
$$;");

            migrationBuilder.Sql(@"CREATE FUNCTION cosecha.check_delivery_not_over_allocated() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_delivery uuid;
    v_amount numeric;
    v_allocated numeric;
BEGIN
    IF TG_TABLE_NAME = 'producer_payment_allocations' THEN
        v_delivery := NEW.delivery_id;
    ELSE
        v_delivery := NEW.id;
    END IF;

    SELECT amount_crc INTO v_amount FROM cosecha.producer_deliveries WHERE id = v_delivery;
    SELECT COALESCE(SUM(a.amount_crc), 0) INTO v_allocated
      FROM cosecha.producer_payment_allocations a
      JOIN cosecha.producer_payments p ON p.id = a.payment_id
     WHERE a.delivery_id = v_delivery AND p.voided_at IS NULL;

    IF v_allocated > COALESCE(v_amount, 0) THEN
        RAISE EXCEPTION 'Los pagos aplicados (%) superan el monto de la entrega (%).', v_allocated, COALESCE(v_amount, 0)
            USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;");

            migrationBuilder.Sql("CREATE TRIGGER tr_change_log_entries_append_only BEFORE UPDATE OR DELETE ON cosecha.change_log_entries FOR EACH ROW EXECUTE FUNCTION cosecha.forbid_modification();");
            migrationBuilder.Sql("CREATE TRIGGER tr_payment_policy_versions_append_only BEFORE UPDATE OR DELETE ON cosecha.payment_policy_versions FOR EACH ROW EXECUTE FUNCTION cosecha.forbid_modification();");
            migrationBuilder.Sql("CREATE TRIGGER tr_claims_policy_versions_append_only BEFORE UPDATE OR DELETE ON cosecha.claims_policy_versions FOR EACH ROW EXECUTE FUNCTION cosecha.forbid_modification();");
            migrationBuilder.Sql("CREATE CONSTRAINT TRIGGER tr_allocations_within_delivery_amount AFTER INSERT OR UPDATE ON cosecha.producer_payment_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cosecha.check_delivery_not_over_allocated();");
            migrationBuilder.Sql("CREATE CONSTRAINT TRIGGER tr_deliveries_amount_covers_allocations AFTER UPDATE ON cosecha.producer_deliveries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cosecha.check_delivery_not_over_allocated();");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER tr_deliveries_amount_covers_allocations ON cosecha.producer_deliveries;");
            migrationBuilder.Sql("DROP TRIGGER tr_allocations_within_delivery_amount ON cosecha.producer_payment_allocations;");
            migrationBuilder.Sql("DROP TRIGGER tr_claims_policy_versions_append_only ON cosecha.claims_policy_versions;");
            migrationBuilder.Sql("DROP TRIGGER tr_payment_policy_versions_append_only ON cosecha.payment_policy_versions;");
            migrationBuilder.Sql("DROP TRIGGER tr_change_log_entries_append_only ON cosecha.change_log_entries;");
            migrationBuilder.Sql("DROP FUNCTION cosecha.check_delivery_not_over_allocated();");
            migrationBuilder.Sql("DROP FUNCTION cosecha.forbid_modification();");

            migrationBuilder.DropTable(
                name: "claims_policy_versions",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "payment_policy_versions",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "change_log_entries",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "producer_payment_allocations",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "producer_payments",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "producer_deliveries",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "shipment_orders",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "shipments",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "order_lines",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "orders",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "buyer_contacts",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "buyers",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "producer_season_capacities",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "producer_phones",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "producers",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "seasons",
                schema: "cosecha");

            migrationBuilder.DropTable(
                name: "products",
                schema: "cosecha");

            // El esquema se conserva: también guarda el historial de migraciones de este módulo.
        }
    }
}
