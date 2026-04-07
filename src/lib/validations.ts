import { z } from "zod";

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(72, "Mot de passe trop long"),
  fullName: z.string().trim().min(1, "Le nom est requis").max(100, "Nom trop long"),
  phone: z.string().trim().max(20, "Numéro trop long").optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

// Club schemas
export const clubSchema = z.object({
  name: z.string().trim().min(1, "Le nom du club est requis").max(100, "Le nom du club ne peut pas dépasser 100 caractères"),
});

// Category schemas
export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Le nom de la catégorie est requis")
    .max(100, "Le nom de la catégorie ne peut pas dépasser 100 caractères"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Player schemas
export const playerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Le nom du joueur est requis")
    .max(100, "Le nom du joueur ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
  birthYear: z.number().int().min(1950, "Année invalide").max(new Date().getFullYear(), "Année invalide").optional(),
});

export type PlayerFormData = z.infer<typeof playerSchema>;

// Measurement schemas
export const measurementSchema = z.object({
  weight_kg: z.number().min(20, "Poids minimum 20 kg").max(200, "Poids maximum 200 kg").optional(),
  height_cm: z.number().min(100, "Taille minimum 100 cm").max(250, "Taille maximum 250 cm").optional(),
  measurement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
}).refine((data) => data.weight_kg !== undefined || data.height_cm !== undefined, {
  message: "Au moins le poids ou la taille doit être renseigné",
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;

// Date range validation: ensures end_date >= start_date
export const dateRangeRefinement = (startField: string, endField: string, message?: string) => {
  return (data: Record<string, any>, ctx: z.RefinementCtx) => {
    const start = data[startField];
    const end = data[endField];
    if (start && end && end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: message || "La date de fin doit être postérieure ou égale à la date de début",
        path: [endField],
      });
    }
  };
};
