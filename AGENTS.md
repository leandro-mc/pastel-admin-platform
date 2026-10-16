# Engineering guide for Pastel Workspace

## Non-negotiable product constraints
- Keep the product UI in Spanish and preserve accessible labels, keyboard focus, responsive layouts, and light/dark themes.
- Use only the approved sage/green, soft blue, sand, coral, and neutral palette. **Never introduce purple, violet, indigo, or similar hues.**
- Never store access or refresh tokens in browser storage. Preserve HttpOnly + Secure cookies, CSRF protection, and same-origin APIs.
- Authorization belongs on the API. Hiding UI controls is never an authorization control.
- Deny by default. A disabled module must deny all its permissions; an explicit user deny must beat inherited grants.
- Never commit secrets, real credentials, `.env` files, database dumps, or production data.

## Architecture boundaries
- `Pastel.Domain`: domain entities and invariants; no infrastructure references.
- `Pastel.Application`: use-case contracts and abstractions.
- `Pastel.Infrastructure`: EF Core/PostgreSQL, persistence, token/session services, authorization handlers.
- `Pastel.Api`: HTTP, controllers, middleware, composition root.
- `web`: React + TypeScript SPA. Keep business rules out of presentation components.

## Change workflow
1. Inspect current code and tests before editing.
2. State the intended design briefly for non-trivial changes.
3. Create a feature branch; never commit directly to `main` for feature work.
4. Add or update tests with every security or business rule change.
5. Run `dotnet test Pastel.slnx`, `npm run build`, `npm run lint`, and Docker Compose build when tooling is available. Report commands that could not run honestly.
6. Review the full diff for credential leaks, privilege escalation, regressions, and dependency changes.
7. Use focused, conventional commits. Do not claim runtime or security verification without evidence.

## New module checklist
- Define stable `<module>.<action>` permission codes and register the module/permissions in the catalog.
- Add domain/application/infrastructure pieces as appropriate.
- Guard every protected API operation with the matching dynamic permission policy.
- Ensure disabled modules cannot be used even if a role or user has a grant.
- Extend the Settings UI if needed, and add tests for allowed, denied, direct override, and disabled-module paths.
- Add a migration if the schema changes; never use `EnsureCreated` as a substitute for migrations.
- Document endpoints, configuration, migrations, and how to test the module.
