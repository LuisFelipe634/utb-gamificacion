import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInstitutionalEmail,
  parseInstitutionalEmail,
  validatePassword,
  validateStudentCode,
} from "./institutionalEmail";

describe("institutionalEmail", () => {
  it("normaliza y rechaza dominios falsos", () => {
    assert.equal(normalizeInstitutionalEmail("  Demo@UTB.EDU.CO "), "demo@utb.edu.co");
    assert.equal(normalizeInstitutionalEmail("evil@utb.edu.co.evil.com"), null);
    assert.equal(normalizeInstitutionalEmail("a@utb.edu.co.evil.com"), null);
    assert.equal(normalizeInstitutionalEmail("user@gmail.com"), null);
  });

  it("parsea código del local-part numérico", () => {
    const parsed = parseInstitutionalEmail("2019123456@utb.edu.co");
    assert.deepEqual(parsed, { kind: "code", studentCode: "2019123456", admissionYear: 2019 });
  });

  it("marca nominal para resolver vía allowlist/código manual", () => {
    const parsed = parseInstitutionalEmail("juan.perez@utb.edu.co");
    assert.equal(parsed?.kind, "named");
  });

  it("valida password y código", () => {
    assert.equal(validatePassword("demo123"), "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número");
    assert.equal(validatePassword("Demo1234"), null);
    assert.equal(validateStudentCode("abc"), "Código estudiantil inválido (8-10 dígitos)");
    assert.equal(validateStudentCode("2019123456"), null);
  });
});
