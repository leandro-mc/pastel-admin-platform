using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Pastel.Modules.Agora.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAgoraContentModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categories",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "series",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_series", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tags",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "articles",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Title = table.Column<string>(type: "character varying(90)", maxLength: 90, nullable: false),
                    Summary = table.Column<string>(type: "character varying(280)", maxLength: 280, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    KnownText = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true),
                    UnknownText = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    WhyItMatters = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    Body = table.Column<string>(type: "text", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    SeriesId = table.Column<Guid>(type: "uuid", nullable: true),
                    SeriesOrder = table.Column<int>(type: "integer", nullable: true),
                    PeriodLabel = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AuthorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SubstantiveVersion = table.Column<int>(type: "integer", nullable: false),
                    ReadingMinutes = table.Column<int>(type: "integer", nullable: false),
                    DailyPickOrder = table.Column<int>(type: "integer", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_articles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_articles_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalSchema: "agora",
                        principalTable: "categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_articles_series_SeriesId",
                        column: x => x.SeriesId,
                        principalSchema: "agora",
                        principalTable: "series",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "article_tags",
                schema: "agora",
                columns: table => new
                {
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_article_tags", x => new { x.ArticleId, x.TagId });
                    table.ForeignKey(
                        name: "FK_article_tags_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_article_tags_tags_TagId",
                        column: x => x.TagId,
                        principalSchema: "agora",
                        principalTable: "tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "article_contributors",
                schema: "agora",
                columns: table => new
                {
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_article_contributors", x => new { x.ArticleId, x.UserId });
                    table.ForeignKey(
                        name: "FK_article_contributors_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sources",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Author = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    PublishedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ContextNote = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sources_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "video_embeds",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    YouTubeId = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Note = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_video_embeds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_video_embeds_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "corrections",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    CorrectedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Text = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_corrections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_corrections_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "verifications",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewerName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VerifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Scope = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SubstantiveVersion = table.Column<int>(type: "integer", nullable: false),
                    WithdrawnAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    WithdrawnByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    WithdrawalNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_verifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_verifications_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "news_links",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Headline = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Outlet = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PublishedOn = table.Column<DateOnly>(type: "date", nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ContextNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Topic = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_news_links", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "saved_articles",
                schema: "agora",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    SavedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_saved_articles", x => new { x.UserId, x.ArticleId });
                    table.ForeignKey(
                        name: "FK_saved_articles_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "followed_categories",
                schema: "agora",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    FollowedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_followed_categories", x => new { x.UserId, x.CategoryId });
                    table.ForeignKey(
                        name: "FK_followed_categories_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalSchema: "agora",
                        principalTable: "categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reactions",
                schema: "agora",
                columns: table => new
                {
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reactions", x => new { x.ArticleId, x.UserId, x.Kind });
                    table.ForeignKey(
                        name: "FK_reactions_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "error_reports",
                schema: "agora",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ArticleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReporterUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResolvedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ResolutionNote = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_error_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_error_reports_articles_ArticleId",
                        column: x => x.ArticleId,
                        principalSchema: "agora",
                        principalTable: "articles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_categories_Slug",
                schema: "agora",
                table: "categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_series_Slug",
                schema: "agora",
                table: "series",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tags_Slug",
                schema: "agora",
                table: "tags",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_articles_CategoryId",
                schema: "agora",
                table: "articles",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_articles_SeriesId",
                schema: "agora",
                table: "articles",
                column: "SeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_articles_Slug",
                schema: "agora",
                table: "articles",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_articles_Status_PublishedAt",
                schema: "agora",
                table: "articles",
                columns: new[] { "Status", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_article_tags_TagId",
                schema: "agora",
                table: "article_tags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_sources_ArticleId",
                schema: "agora",
                table: "sources",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_video_embeds_ArticleId",
                schema: "agora",
                table: "video_embeds",
                column: "ArticleId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_corrections_ArticleId",
                schema: "agora",
                table: "corrections",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_verifications_ArticleId",
                schema: "agora",
                table: "verifications",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_saved_articles_ArticleId",
                schema: "agora",
                table: "saved_articles",
                column: "ArticleId");

            migrationBuilder.CreateIndex(
                name: "IX_followed_categories_CategoryId",
                schema: "agora",
                table: "followed_categories",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_error_reports_ArticleId",
                schema: "agora",
                table: "error_reports",
                column: "ArticleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "error_reports",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "reactions",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "followed_categories",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "saved_articles",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "news_links",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "verifications",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "corrections",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "video_embeds",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "sources",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "article_contributors",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "article_tags",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "articles",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "tags",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "series",
                schema: "agora");

            migrationBuilder.DropTable(
                name: "categories",
                schema: "agora");
        }
    }
}
