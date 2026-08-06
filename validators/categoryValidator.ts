import { z } from "zod";

export const createCategorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    slug: z.string().min(1, "Slug must not be empty").optional(),
    attribute_schema: z.record(z.string(), z.any()).optional().default({}),
    default_budget_weight_pct: z.coerce.number().min(0, "Percentage must be >= 0").max(100, "Percentage must be <= 100"),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    attribute_schema: z.record(z.string(), z.any()).optional(),
    default_budget_weight_pct: z.coerce.number().min(0).max(100).optional(),
});
