using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Huella.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHuellaProfileModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "profiles",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Headline = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Summary = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: false),
                    Location = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Availability = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    ContactEmail = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    ContactPhone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ShowContactEmail = table.Column<bool>(type: "boolean", nullable: false),
                    ShowContactPhone = table.Column<bool>(type: "boolean", nullable: false),
                    ShowLocation = table.Column<bool>(type: "boolean", nullable: false),
                    ShowAvailability = table.Column<bool>(type: "boolean", nullable: false),
                    PublicTokenHash = table.Column<byte[]>(type: "bytea", nullable: true),
                    PublicTokenCreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PublishedVersion = table.Column<int>(type: "integer", nullable: true),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_profiles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "job_offers",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Company = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    SourceUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    RawText = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: false),
                    TextHash = table.Column<byte[]>(type: "bytea", nullable: false),
                    AnalysisJson = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_offers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_offers_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "profile_links",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Label = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_profile_links", x => x.Id);
                    table.ForeignKey(
                        name: "FK_profile_links_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "private_notes",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Story = table.Column<string>(type: "character varying(6000)", maxLength: 6000, nullable: false),
                    Voice = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    Residence = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    WorkMode = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Availability = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    WorkAuthorization = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    SalaryExpectation = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Avoid = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    PreferredLanguage = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    PreferredPaper = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    ExtraBannedPhrases = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_private_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_private_notes_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "experiences",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    MarketRole = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Company = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Location = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    EmploymentType = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                    WorkMode = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Narrative = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    CompanyContext = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    TeamSize = table.Column<int>(type: "integer", nullable: true),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experiences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_experiences_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "projects",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    Summary = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    Approach = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    Stack = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    StartYear = table.Column<int>(type: "integer", nullable: true),
                    EndYear = table.Column<int>(type: "integer", nullable: true),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_projects_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "skills",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Aliases = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    FirstUsedYear = table.Column<int>(type: "integer", nullable: true),
                    LastUsedYear = table.Column<int>(type: "integer", nullable: true),
                    Why = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_skills_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "educations",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Degree = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Institution = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    StartYear = table.Column<int>(type: "integer", nullable: true),
                    EndYear = table.Column<int>(type: "integer", nullable: true),
                    Note = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_educations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_educations_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "certifications",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Issuer = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    IssuedYear = table.Column<int>(type: "integer", nullable: true),
                    ExpiresYear = table.Column<int>(type: "integer", nullable: true),
                    CredentialUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_certifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_certifications_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "language_skills",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Language = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Level = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    Evidence = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_language_skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_language_skills_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "published_snapshots",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Number = table.Column<int>(type: "integer", nullable: false),
                    ContentJson = table.Column<string>(type: "jsonb", nullable: false),
                    CvContentJson = table.Column<string>(type: "jsonb", nullable: true),
                    ContentHash = table.Column<byte[]>(type: "bytea", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_published_snapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_published_snapshots_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cv_versions",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobOfferId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Level = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Paper = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    Language = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    Mode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Focus = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ContentJson = table.Column<string>(type: "jsonb", nullable: false),
                    ReportJson = table.Column<string>(type: "jsonb", nullable: true),
                    Pages = table.Column<short>(type: "smallint", nullable: false),
                    LinesUsed = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: false),
                    LineBudget = table.Column<int>(type: "integer", nullable: false),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    Source = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cv_versions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cv_versions_profiles_ProfileId",
                        column: x => x.ProfileId,
                        principalSchema: "huella",
                        principalTable: "profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cv_versions_job_offers_JobOfferId",
                        column: x => x.JobOfferId,
                        principalSchema: "huella",
                        principalTable: "job_offers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "achievements",
                schema: "huella",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExperienceId = table.Column<Guid>(type: "uuid", nullable: true),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    RawText = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true),
                    Situation = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Action = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ResultValue = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    ResultUnit = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    ResultBaseline = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    ImpactType = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Strength = table.Column<short>(type: "smallint", nullable: false),
                    ShortText = table.Column<string>(type: "character varying(110)", maxLength: 110, nullable: false),
                    LongText = table.Column<string>(type: "character varying(170)", maxLength: 170, nullable: false),
                    Verified = table.Column<bool>(type: "boolean", nullable: false),
                    Source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Visibility = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_achievements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_achievements_experiences_ExperienceId",
                        column: x => x.ExperienceId,
                        principalSchema: "huella",
                        principalTable: "experiences",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_achievements_projects_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "huella",
                        principalTable: "projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.CheckConstraint("CK_achievements_one_parent", "(\"ExperienceId\" IS NULL) <> (\"ProjectId\" IS NULL)");
                    table.CheckConstraint("CK_achievements_strength", "\"Strength\" BETWEEN 1 AND 5");
                });

            migrationBuilder.CreateTable(
                name: "achievement_skills",
                schema: "huella",
                columns: table => new
                {
                    AchievementId = table.Column<Guid>(type: "uuid", nullable: false),
                    SkillId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_achievement_skills", x => new { x.AchievementId, x.SkillId });
                    table.ForeignKey(
                        name: "FK_achievement_skills_achievements_AchievementId",
                        column: x => x.AchievementId,
                        principalSchema: "huella",
                        principalTable: "achievements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_achievement_skills_skills_SkillId",
                        column: x => x.SkillId,
                        principalSchema: "huella",
                        principalTable: "skills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_achievement_skills_SkillId",
                schema: "huella",
                table: "achievement_skills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_achievements_ExperienceId",
                schema: "huella",
                table: "achievements",
                column: "ExperienceId");

            migrationBuilder.CreateIndex(
                name: "IX_achievements_ProjectId",
                schema: "huella",
                table: "achievements",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_certifications_ProfileId",
                schema: "huella",
                table: "certifications",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_cv_versions_JobOfferId",
                schema: "huella",
                table: "cv_versions",
                column: "JobOfferId");

            migrationBuilder.CreateIndex(
                name: "IX_cv_versions_ProfileId",
                schema: "huella",
                table: "cv_versions",
                column: "ProfileId",
                unique: true,
                filter: "\"IsPublic\"");

            migrationBuilder.CreateIndex(
                name: "IX_cv_versions_ProfileId_CreatedAt",
                schema: "huella",
                table: "cv_versions",
                columns: new[] { "ProfileId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_educations_ProfileId",
                schema: "huella",
                table: "educations",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_experiences_ProfileId",
                schema: "huella",
                table: "experiences",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_job_offers_ProfileId_CreatedAt",
                schema: "huella",
                table: "job_offers",
                columns: new[] { "ProfileId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_language_skills_ProfileId",
                schema: "huella",
                table: "language_skills",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_private_notes_ProfileId",
                schema: "huella",
                table: "private_notes",
                column: "ProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_profile_links_ProfileId",
                schema: "huella",
                table: "profile_links",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_profiles_OwnerUserId",
                schema: "huella",
                table: "profiles",
                column: "OwnerUserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_profiles_PublicTokenHash",
                schema: "huella",
                table: "profiles",
                column: "PublicTokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_projects_ProfileId",
                schema: "huella",
                table: "projects",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_published_snapshots_ProfileId_Number",
                schema: "huella",
                table: "published_snapshots",
                columns: new[] { "ProfileId", "Number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_skills_ProfileId_NormalizedName",
                schema: "huella",
                table: "skills",
                columns: new[] { "ProfileId", "NormalizedName" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "achievement_skills",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "achievements",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "cv_versions",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "published_snapshots",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "language_skills",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "certifications",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "educations",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "skills",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "projects",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "experiences",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "private_notes",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "profile_links",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "job_offers",
                schema: "huella");

            migrationBuilder.DropTable(
                name: "profiles",
                schema: "huella");
        }
    }
}
