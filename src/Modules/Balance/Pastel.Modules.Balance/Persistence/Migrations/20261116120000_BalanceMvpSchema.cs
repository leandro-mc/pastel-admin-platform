using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Pastel.Modules.Balance.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BalanceMvpSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "currencies",
                schema: "balance",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    numeric_code = table.Column<short>(type: "smallint", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    symbol = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    decimals = table.Column<short>(type: "smallint", nullable: false),
                    sort_order = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_currencies", x => x.code);
                    table.CheckConstraint("ck_currencies_code_format", "code ~ '^[A-Z]{3}$'");
                    table.CheckConstraint("ck_currencies_decimals", "decimals IN (0, 2)");
                });

            migrationBuilder.CreateTable(
                name: "groups",
                schema: "balance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    time_zone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    participant_seq = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_groups", x => x.id);
                    table.CheckConstraint("ck_groups_name_not_blank", "btrim(name) <> ''");
                    table.CheckConstraint("ck_groups_time_zone_not_blank", "btrim(time_zone) <> ''");
                    table.CheckConstraint("ck_groups_participant_seq", "participant_seq >= 0");
                    table.ForeignKey(
                        name: "FK_groups_currencies_currency_code",
                        column: x => x.currency_code,
                        principalSchema: "balance",
                        principalTable: "currencies",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "join_credentials",
                schema: "balance",
                columns: table => new
                {
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    code = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    rotated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    rotated_by = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_join_credentials", x => x.group_id);
                    table.CheckConstraint("ck_join_credentials_code_format", "code ~ '^[0-9]{4}$'");
                    table.ForeignKey(
                        name: "FK_join_credentials_groups_group_id",
                        column: x => x.group_id,
                        principalSchema: "balance",
                        principalTable: "groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "participants",
                schema: "balance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    role = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    join_order = table.Column<int>(type: "integer", nullable: false),
                    joined_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_participants", x => x.id);
                    table.UniqueConstraint("AK_participants_group_id_id", x => new { x.group_id, x.id });
                    table.CheckConstraint("ck_participants_role", "role IN ('admin', 'member')");
                    table.CheckConstraint("ck_participants_join_order", "join_order > 0");
                    table.CheckConstraint("ck_participants_display_name_not_blank", "btrim(display_name) <> ''");
                    table.ForeignKey(
                        name: "FK_participants_groups_group_id",
                        column: x => x.group_id,
                        principalSchema: "balance",
                        principalTable: "groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expenses",
                schema: "balance",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    payer_participant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    expense_date = table.Column<DateOnly>(type: "date", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expenses", x => x.id);
                    table.CheckConstraint("ck_expenses_amount_positive", "amount > 0");
                    table.CheckConstraint("ck_expenses_description_length", "char_length(btrim(description)) BETWEEN 4 AND 500");
                    table.ForeignKey(
                        name: "FK_expenses_groups_group_id",
                        column: x => x.group_id,
                        principalSchema: "balance",
                        principalTable: "groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_expenses_participants_group_id_payer_participant_id",
                        columns: x => new { x.group_id, x.payer_participant_id },
                        principalSchema: "balance",
                        principalTable: "participants",
                        principalColumns: new[] { "group_id", "id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "group_events",
                schema: "balance",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    actor_account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    kind = table.Column<string>(type: "character varying(48)", maxLength: 48, nullable: false),
                    details = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_events", x => x.id);
                    table.CheckConstraint("ck_group_events_kind_not_blank", "btrim(kind) <> ''");
                    table.ForeignKey(
                        name: "FK_group_events_groups_group_id",
                        column: x => x.group_id,
                        principalSchema: "balance",
                        principalTable: "groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_currencies_numeric_code",
                schema: "balance",
                table: "currencies",
                column: "numeric_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_groups_currency_code",
                schema: "balance",
                table: "groups",
                column: "currency_code");

            migrationBuilder.CreateIndex(
                name: "IX_join_credentials_token",
                schema: "balance",
                table: "join_credentials",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_participants_account_id",
                schema: "balance",
                table: "participants",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_participants_group_id_account_id",
                schema: "balance",
                table: "participants",
                columns: new[] { "group_id", "account_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_participants_group_id_join_order",
                schema: "balance",
                table: "participants",
                columns: new[] { "group_id", "join_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_expenses_group_id_expense_date_id",
                schema: "balance",
                table: "expenses",
                columns: new[] { "group_id", "expense_date", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_expenses_group_id_payer_participant_id",
                schema: "balance",
                table: "expenses",
                columns: new[] { "group_id", "payer_participant_id" });

            migrationBuilder.CreateIndex(
                name: "IX_group_events_group_id_occurred_at",
                schema: "balance",
                table: "group_events",
                columns: new[] { "group_id", "occurred_at" });

            // Datos de referencia: el catálogo de monedas (misma lista que CurrencyCatalog) para que la base impida códigos fuera de él.
            migrationBuilder.Sql("""
                INSERT INTO balance.currencies (code, numeric_code, name, symbol, decimals, sort_order)
                VALUES
                ('CRC', 188, 'Colón costarricense', '₡', 2, 1),
                ('USD', 840, 'Dólar estadounidense', '$', 2, 2),
                ('EUR', 978, 'Euro', '€', 2, 3),
                ('MXN', 484, 'Peso mexicano', '$', 2, 4),
                ('COP', 170, 'Peso colombiano', '$', 2, 5),
                ('ARS', 32, 'Peso argentino', '$', 2, 6),
                ('CLP', 152, 'Peso chileno', '$', 0, 7),
                ('UYU', 858, 'Peso uruguayo', '$U', 2, 8),
                ('DOP', 214, 'Peso dominicano', 'RD$', 2, 9),
                ('CUP', 192, 'Peso cubano', '$', 2, 10),
                ('PHP', 608, 'Peso filipino', '₱', 2, 11),
                ('JPY', 392, 'Yen japonés', '¥', 0, 12),
                ('CNY', 156, 'Yuan renminbi chino', '¥', 2, 13),
                ('KRW', 410, 'Won surcoreano', '₩', 0, 14),
                ('PEN', 604, 'Sol peruano', 'S/', 2, 15),
                ('BRL', 986, 'Real brasileño', 'R$', 2, 16),
                ('GTQ', 320, 'Quetzal guatemalteco', 'Q', 2, 17),
                ('HNL', 340, 'Lempira hondureño', 'L', 2, 18),
                ('NIO', 558, 'Córdoba nicaragüense', 'C$', 2, 19),
                ('PAB', 590, 'Balboa panameño', 'B/.', 2, 20),
                ('PYG', 600, 'Guaraní paraguayo', '₲', 0, 21),
                ('BOB', 68, 'Boliviano', 'Bs.', 2, 22),
                ('VES', 928, 'Bolívar venezolano', 'Bs.S', 2, 23),
                ('CAD', 124, 'Dólar canadiense', '$', 2, 24),
                ('GBP', 826, 'Libra esterlina', '£', 2, 25),
                ('CHF', 756, 'Franco suizo', 'CHF', 2, 26),
                ('SEK', 752, 'Corona sueca', 'kr', 2, 27),
                ('NOK', 578, 'Corona noruega', 'kr', 2, 28),
                ('DKK', 208, 'Corona danesa', 'kr', 2, 29),
                ('PLN', 985, 'Esloti polaco', 'zł', 2, 30),
                ('AUD', 36, 'Dólar australiano', '$', 2, 31),
                ('NZD', 554, 'Dólar neozelandés', '$', 2, 32),
                ('SGD', 702, 'Dólar singapurense', '$', 2, 33),
                ('HKD', 344, 'Dólar de Hong Kong', '$', 2, 34),
                ('INR', 356, 'Rupia india', '₹', 2, 35),
                ('THB', 764, 'Baht tailandés', '฿', 2, 36),
                ('TRY', 949, 'Lira turca', '₺', 2, 37),
                ('ZAR', 710, 'Rand sudafricano', 'R', 2, 38),
                ('AED', 784, 'Dírham de los Emiratos Árabes Unidos', 'AED', 2, 39),
                ('ILS', 376, 'Nuevo shéquel israelí', '₪', 2, 40);
                """);

            // Garantía en la base de que un grupo conserva al menos una persona administradora (la valida al confirmar la transacción,
            // así que permite relevar a la única administración dentro de una misma transacción). Si el grupo se borra, no aplica.
            migrationBuilder.Sql("""
                CREATE FUNCTION balance.ensure_group_has_admin() RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM balance.groups g WHERE g.id = OLD.group_id)
                       AND NOT EXISTS (SELECT 1 FROM balance.participants p WHERE p.group_id = OLD.group_id AND p.role = 'admin') THEN
                        RAISE EXCEPTION 'balance.group.last_admin: un grupo debe conservar al menos una persona administradora'
                            USING ERRCODE = '23514';
                    END IF;
                    RETURN NULL;
                END
                $$;
                """);

            migrationBuilder.Sql("""
                CREATE CONSTRAINT TRIGGER trg_participants_keep_admin
                AFTER UPDATE OF role OR DELETE ON balance.participants
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION balance.ensure_group_has_admin();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_participants_keep_admin ON balance.participants;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS balance.ensure_group_has_admin();");

            migrationBuilder.DropTable(name: "group_events", schema: "balance");
            migrationBuilder.DropTable(name: "expenses", schema: "balance");
            migrationBuilder.DropTable(name: "participants", schema: "balance");
            migrationBuilder.DropTable(name: "join_credentials", schema: "balance");
            migrationBuilder.DropTable(name: "groups", schema: "balance");
            migrationBuilder.DropTable(name: "currencies", schema: "balance");
        }
    }
}
