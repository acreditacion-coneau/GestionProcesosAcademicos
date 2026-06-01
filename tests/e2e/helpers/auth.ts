import { expect, type Page, type TestInfo } from "@playwright/test";

export type E2ERole = "jefe" | "docente" | "secretaria";

const defaultUsers: Record<E2ERole, { dni: string; password: string }> = {
  jefe: {
    dni: process.env.E2E_JEFE_DNI ?? "",
    password: process.env.E2E_JEFE_PASSWORD ?? "",
  },
  docente: {
    dni: process.env.E2E_DOCENTE_DNI ?? "12345678",
    password: process.env.E2E_DOCENTE_PASSWORD ?? "12345678",
  },
  secretaria: {
    dni: process.env.E2E_SECRETARIA_DNI ?? "45678901",
    password: process.env.E2E_SECRETARIA_PASSWORD ?? "45678901",
  },
};

export function requireE2ECredentials(role: E2ERole, testInfo: TestInfo) {
  const credentials = defaultUsers[role];
  if (!credentials.dni || !credentials.password) {
    testInfo.skip(true, `Faltan credenciales E2E para rol ${role}. Configure E2E_${role.toUpperCase()}_DNI y E2E_${role.toUpperCase()}_PASSWORD.`);
  }
  return credentials;
}

export async function loginAs(page: Page, role: E2ERole, testInfo: TestInfo) {
  const credentials = requireE2ECredentials(role, testInfo);

  await page.goto("/login");
  await page.getByPlaceholder("Ej: 12345678").fill(credentials.dni);
  await page.getByPlaceholder("Ingrese su contraseña").fill(credentials.password);
  await page.getByRole("button", { name: /ingresar al sistema/i }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
