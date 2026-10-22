import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findVoseo, scanRepository } from "../check-voseo.mjs";

const words = (text) => findVoseo(text).map((finding) => finding.word.toLowerCase());

test("detecta imperativos voseantes", () => {
  assert.deepEqual(words("Ingresá tu correo y revisá los datos"), ["ingresá", "revisá"]);
  assert.deepEqual(words('hint: "Elegí una opción"'), ["elegí"]);
});

test("detecta presente voseante y el pronombre vos", () => {
  assert.deepEqual(words("Si vos no tenés permiso, podés pedirlo"), ["vos", "tenés", "podés"]);
  assert.deepEqual(words("vos sos administrador"), ["vos", "sos"]);
});

test("no marca el trato de usted ni el impersonal", () => {
  assert.deepEqual(findVoseo("Ingrese su correo. Revise los datos. No se pudo guardar. Intente de nuevo."), []);
  assert.deepEqual(findVoseo("Cópiela ahora y entréguela a la persona por un canal seguro."), []);
});

test("no marca palabras con acento que no son voseo", () => {
  assert.deepEqual(findVoseo("El estado fue leído y está listo; será revisado más tarde, además del país."), []);
  assert.deepEqual(findVoseo("Llame al SOS 911 y consulte la sección de ayuda"), []);
});

test("el comentario check-voseo:allow exime solo esa línea", () => {
  const text = "Probá esto // check-voseo:allow\nProbá esto";
  assert.deepEqual(findVoseo(text), [{ line: 2, word: "Probá" }]);
});

test("el texto de producto del repositorio no contiene voseo (F0-W09)", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  assert.deepEqual(scanRepository(root), []);
});
