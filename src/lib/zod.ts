import { z } from "zod";

// Default validation messages in Brazilian Portuguese (custom messages still take precedence).
z.config(z.locales.ptBR());

export { z };
