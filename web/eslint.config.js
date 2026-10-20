import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app", "@/app/*", "@/app/*/**"],
              message: "Los módulos de negocio solo pueden depender de @/core/*, nunca del shell.",
            },
            {
              group: [
                "@/modules",
                "@/modules/*",
                "@/modules/*/**",
              ],
              message: "Una subapp no debe importar otra subapp; extraiga contratos compartidos a @/core/*.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules", "@/modules/*", "@/modules/*/**"],
              message: "El shell y core deben descubrir las subapps mediante los manifiestos, no importarlas directamente.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    // Se usa core/log en lugar de console (ERROR_HANDLING_AND_LOGGING.md §3).
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
    },
  },
);
