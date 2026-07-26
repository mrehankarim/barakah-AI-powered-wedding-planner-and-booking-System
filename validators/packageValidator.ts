import { z } from "zod";

const toBigInt = (val: unknown) => {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(val);
  if (typeof val === "string") return BigInt(val);
  throw new Error("Invalid bigint value");
};

export const createPackageSchema = z.object({
  title: z.string().optional(),
  totalBudgetPaisa: z.union([z.string(), z.number()]).transform(toBigInt).refine((n) => n > 0n, "Budget must be at least 1 paisa"),
  weddingDate: z.string().datetime().optional(),
  guestCount: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "active", "checked_out"]).optional(),
});

export const updatePackageSchema = z.object({
  title: z.string().optional(),
  totalBudgetPaisa: z.union([z.string(), z.number()]).transform(toBigInt).refine((n) => n > 0n).optional(),
  weddingDate: z.string().datetime().optional(),
  guestCount: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "active", "checked_out"]).optional(),
});

export const addPackageItemSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  listingId: z.string().optional(),
  tierId: z.string().optional(),
  allocatedBudgetPaisa: z.union([z.string(), z.number()]).transform(toBigInt).refine((n) => n > 0n, "Allocated budget must be at least 1 paisa"),
  rationaleText: z.string().optional(),
  rankAtSelection: z.coerce.number().int().positive().optional(),
});

export const updatePackageItemSchema = z.object({
  allocatedBudgetPaisa: z.union([z.string(), z.number()]).transform(toBigInt).refine((n) => n > 0n).optional(),
  isLocked: z.boolean().optional(),
  rankAtSelection: z.coerce.number().int().optional(),
  rationaleText: z.string().optional(),
});