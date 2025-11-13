import { z } from "zod";

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(72, "Mot de passe trop long"),
  fullName: z.string().trim().min(1, "Le nom est requis").max(100, "Nom trop long"),
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
    .max(100, "Le nom de la catégorie ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-Z0-9À-ÿ\s'-]+$/, "Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et apostrophes"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Player schemas
export const playerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Le nom du joueur est requis")
    .max(100, "Le nom du joueur ne peut pas dépasser 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes"),
});

export type PlayerFormData = z.infer<typeof playerSchema>;
