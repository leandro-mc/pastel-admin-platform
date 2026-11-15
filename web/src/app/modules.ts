/** Compatibilidad de app; los módulos frontend importan el catálogo desde @/core/modules/catalog. */
export {
  allModules,
  canAccess,
  getRememberedAppPath,
  productModules,
  rememberCurrentApp,
  soleProductModule,
  useAccessibleModules,
} from "@/core/modules/catalog";
