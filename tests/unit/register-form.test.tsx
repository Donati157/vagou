// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { registerSchema } from "@/modules/auth/schemas";
import type { ActionResult } from "@/server/lib/errors";

// Server action stand-in: same schema and error shape as runAction() on validation failure.
const registerAction = vi.fn(async (_prev: unknown, fd: FormData): Promise<ActionResult<null>> => {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (parsed.success) return { ok: true, data: null };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) (fieldErrors[issue.path.join(".")] ??= []).push(issue.message);
  return { ok: false, error: "Revise os campos destacados.", code: "VALIDATION", fieldErrors };
});

vi.mock("@/modules/auth/actions", () => ({
  registerAction: (prev: unknown, fd: FormData) => registerAction(prev, fd),
  loginAction: vi.fn(),
  forgotPasswordAction: vi.fn(),
  resetPasswordAction: vi.fn(),
}));

const { RegisterForm } = await import("@/modules/auth/components/auth-forms");

afterEach(() => {
  cleanup();
  registerAction.mockClear();
});

const fullName = () => screen.getByLabelText("Nome completo") as HTMLInputElement;
const email = () => screen.getByLabelText("E-mail") as HTMLInputElement;
const password = () => screen.getByLabelText("Senha") as HTMLInputElement;
const radio = (label: string) => screen.getByRole("radio", { name: new RegExp(label) }) as HTMLInputElement;
const terms = () => screen.getByRole("checkbox") as HTMLInputElement;

describe("RegisterForm keeps the user's input after validation errors", () => {
  it("preserves name, e-mail, password and account type when the terms are not accepted", async () => {
    const user = userEvent.setup();
    render(<RegisterForm initialType="COMPANY_ADMIN" />);

    await user.type(fullName(), "Maria Souza");
    await user.type(email(), "maria@example.com");
    await user.type(password(), "senha1234");
    await user.click(radio("Sou motorista"));
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("É preciso aceitar os termos para continuar.")).toBeTruthy();
    expect(registerAction).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Revise os campos destacados.")).toBeTruthy();

    expect(fullName().value).toBe("Maria Souza");
    expect(email().value).toBe("maria@example.com");
    expect(password().value).toBe("senha1234");
    expect(radio("Sou motorista").checked).toBe(true);
    expect(radio("Sou um shopping").checked).toBe(false);
    expect(screen.queryByLabelText("Nome do shopping ou grupo")).toBeNull();

    // Only the terms are flagged, and focus goes to them.
    expect(fullName().getAttribute("aria-invalid")).not.toBe("true");
    expect(email().getAttribute("aria-invalid")).not.toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(terms()));
  });

  it("keeps the valid fields intact when only the e-mail and password are invalid", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(radio("Sou um shopping"));
    await user.type(fullName(), "João Lima");
    await user.type(screen.getByLabelText("Nome do shopping ou grupo"), "Shopping Aurora");
    await user.type(email(), "joao@");
    await user.type(password(), "curta");
    await user.click(terms());
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Informe um e-mail válido.")).toBeTruthy();
    expect(screen.getByText("A senha precisa ter pelo menos 8 caracteres.")).toBeTruthy();
    expect(screen.getAllByText("Revise os campos destacados.")).toHaveLength(1);

    expect(fullName().value).toBe("João Lima");
    expect((screen.getByLabelText("Nome do shopping ou grupo") as HTMLInputElement).value).toBe("Shopping Aurora");
    expect(email().value).toBe("joao@");
    expect(password().value).toBe("curta");
    expect(terms().checked).toBe(true);
    expect(radio("Sou um shopping").checked).toBe(true);

    expect(email().getAttribute("aria-invalid")).toBe("true");
    expect(password().getAttribute("aria-invalid")).toBe("true");
    expect(fullName().getAttribute("aria-invalid")).not.toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(email()));
  });
});
