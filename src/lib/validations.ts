import { z } from "zod";

export const clubSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom du club est requis" }).max(100, { message: "Le nom du club ne doit pas dépasser 100 caractères" }),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom de la catégorie est requis" }).max(100, { message: "Le nom de la catégorie ne doit pas dépasser 100 caractères" }),
});

export const playerSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom du joueur est requis" }).max(100, { message: "Le nom du joueur ne doit pas dépasser 100 caractères" }),
});

export const rpeSchema = z.object({
  rpe: z.number().int().min(0, { message: "RPE doit être au minimum 0" }).max(10, { message: "RPE doit être au maximum 10" }),
  duration: z.number().int().min(1, { message: "La durée doit être au minimum 1 minute" }).max(600, { message: "La durée ne doit pas dépasser 600 minutes" }),
});

export const strengthTestSchema = z.object({
  testName: z.string().trim().min(1, { message: "Le nom du test est requis" }).max(100, { message: "Le nom du test ne doit pas dépasser 100 caractères" }),
  weight: z.number().positive({ message: "Le poids doit être positif" }).max(1000, { message: "Le poids ne doit pas dépasser 1000 kg" }),
});

export const speedTestSchema = z.object({
  time: z.number().positive({ message: "Le temps doit être positif" }).max(60, { message: "Le temps ne doit pas dépasser 60 secondes" }),
});

export const sessionSchema = z.object({
  intensity: z.number().int().min(0, { message: "L'intensité doit être au minimum 0" }).max(10, { message: "L'intensité doit être au maximum 10" }).optional(),
  notes: z.string().max(500, { message: "Les notes ne doivent pas dépasser 500 caractères" }).optional(),
});
