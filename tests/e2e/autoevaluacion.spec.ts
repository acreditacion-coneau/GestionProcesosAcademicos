import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Autoevaluacion - flujos reales", () => {
  test("CASO 1: jefe de carrera crea y lanza campania", async ({ page }, testInfo) => {
    await loginAs(page, "jefe", testInfo);
    await page.goto("/autoevaluacion");

    await expect(page.getByText("Panel Jefe de Carrera")).toBeVisible();
    await page.getByPlaceholder("Nombre de campana").fill(`Autoevaluacion E2E ${Date.now()}`);
    await page.getByRole("button", { name: /crear campana/i }).click();
    await expect(page.getByText(/campana creada correctamente/i)).toBeVisible();

    const draft = page.locator("article", { hasText: "Borrador" }).first();
    await expect(draft).toBeVisible();
    await draft.getByRole("button", { name: /lanzar/i }).click();
    await expect(page.getByText(/campana lanzada correctamente/i)).toBeVisible();
  });

  test("CASO 2: docente visualiza asignaciones, responde, firma y envia", async ({ page }, testInfo) => {
    await loginAs(page, "docente", testInfo);
    await page.goto("/autoevaluacion");

    await expect(page.getByText("Mis autoevaluaciones")).toBeVisible();
    await page.getByRole("button", { name: /completar/i }).first().click();
    await expect(page.getByText(/Formulario 1 de/i)).toBeVisible();

    while (await page.getByRole("button", { name: /siguiente formulario/i }).isVisible().catch(() => false)) {
      const optionButtons = page.getByRole("radio", { name: "Si" });
      const optionCount = await optionButtons.count();
      for (let index = 0; index < optionCount; index += 1) {
        await optionButtons.nth(index).click();
      }

      const textareas = page.getByPlaceholder("Escriba su respuesta");
      const textareaCount = await textareas.count();
      for (let index = 0; index < textareaCount; index += 1) {
        await textareas.nth(index).fill("Respuesta automatizada de prueba E2E.");
      }

      await page.getByRole("button", { name: /siguiente formulario/i }).click();
    }

    const finalYesButtons = page.getByRole("radio", { name: "Si" });
    for (let index = 0; index < await finalYesButtons.count(); index += 1) {
      await finalYesButtons.nth(index).click();
    }

    const finalTextareas = page.getByPlaceholder("Escriba su respuesta");
    for (let index = 0; index < await finalTextareas.count(); index += 1) {
      await finalTextareas.nth(index).fill("Cierre automatizado de prueba E2E.");
    }

    await page.locator("canvas").first().click({ position: { x: 30, y: 30 } });
    await page.mouse.down();
    await page.mouse.move(120, 70);
    await page.mouse.up();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /enviar evaluacion/i }).click();
    await expect(page.getByText(/evaluacion completada/i)).toBeVisible();
  });

  test("CASO 3: secretaria visualiza dashboard y completadas", async ({ page }, testInfo) => {
    await loginAs(page, "secretaria", testInfo);
    await page.goto("/autoevaluacion");

    await expect(page.getByText("Panel Secretaria Academica")).toBeVisible();
    await expect(page.getByText("Completadas")).toBeVisible();
    await expect(page.getByText("Pendientes")).toBeVisible();
  });

  test("CASO 4: docente no puede editar evaluacion completada", async ({ page }, testInfo) => {
    await loginAs(page, "docente", testInfo);
    await page.goto("/autoevaluacion");
    await page.getByRole("button", { name: /ver respuestas enviadas/i }).first().click();

    await expect(page.getByRole("radio", { name: "Si" }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /enviar evaluacion/i })).toBeHidden();
  });

  test("CASO 5: campanias vencidas se muestran con estado visual", async ({ page }, testInfo) => {
    await loginAs(page, "docente", testInfo);
    await page.goto("/autoevaluacion");

    await page.getByRole("button", { name: /vencida/i }).click();
    await expect(page.getByText("Vencida").first()).toBeVisible();
  });
});
