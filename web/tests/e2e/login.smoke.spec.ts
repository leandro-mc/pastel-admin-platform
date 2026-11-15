import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("login route renders its heading and brand without a session", async ({
  page,
}) => {
  await page.goto("/ingresar");

  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Pastel, ir al inicio" }),
  ).toBeVisible();
});

test("login route has no axe WCAG A/AA violations", async ({ page }) => {
  await page.goto("/ingresar");
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
