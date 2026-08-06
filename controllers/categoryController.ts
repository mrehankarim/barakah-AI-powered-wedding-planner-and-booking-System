import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import { createCategorySchema, updateCategorySchema } from "../validators/categoryValidator";

const slugify = (text: string): string => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
};

const getAllCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
    });
    return res.status(200).json(new ApiResponse(200, categories, "Categories retrieved successfully"));
});

const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const idOrSlug = req.params["id"] as string;

    const category = await prisma.category.findFirst({
        where: {
            OR: [
                { id: idOrSlug.match(/^[0-9a-fA-F-]{36}$/) ? idOrSlug : undefined },
                { slug: idOrSlug },
            ].filter(Boolean) as any,
        },
        include: {
            _count: {
                select: { listings: true, package_line_items: true },
            },
        },
    });

    if (!category) throw new ApiError(404, "Category not found");

    return res.status(200).json(new ApiResponse(200, category, "Category details retrieved"));
});

const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const parse = createCategorySchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const { name, attribute_schema, default_budget_weight_pct } = parse.data;
    const slug = parse.data.slug ? slugify(parse.data.slug) : slugify(name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw new ApiError(409, `Category with slug '${slug}' already exists`);

    const category = await prisma.category.create({
        data: {
            name,
            slug,
            attribute_schema: (attribute_schema as any) || {},
            default_budget_weight_pct,
        },
    });

    return res.status(201).json(new ApiResponse(201, category, "Category created successfully"));
});

const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = req.params["id"] as string;

    const parse = updateCategorySchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const existingCategory = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existingCategory) throw new ApiError(404, "Category not found");

    const updateData: Record<string, unknown> = {};

    if (parse.data.name !== undefined) updateData["name"] = parse.data.name;
    if (parse.data.attribute_schema !== undefined) updateData["attribute_schema"] = parse.data.attribute_schema;
    if (parse.data.default_budget_weight_pct !== undefined) {
        updateData["default_budget_weight_pct"] = parse.data.default_budget_weight_pct;
    }

    if (parse.data.slug !== undefined) {
        const newSlug = slugify(parse.data.slug);
        if (newSlug !== existingCategory.slug) {
            const slugCheck = await prisma.category.findUnique({ where: { slug: newSlug } });
            if (slugCheck) throw new ApiError(409, `Category with slug '${newSlug}' already exists`);
            updateData["slug"] = newSlug;
        }
    } else if (parse.data.name !== undefined && parse.data.name !== existingCategory.name) {
        const newSlug = slugify(parse.data.name);
        if (newSlug !== existingCategory.slug) {
            const slugCheck = await prisma.category.findUnique({ where: { slug: newSlug } });
            if (!slugCheck) {
                updateData["slug"] = newSlug;
            }
        }
    }

    const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data: updateData,
    });

    return res.status(200).json(new ApiResponse(200, updatedCategory, "Category updated successfully"));
});

const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = req.params["id"] as string;

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
            _count: {
                select: { listings: true, package_line_items: true },
            },
        },
    });

    if (!category) throw new ApiError(404, "Category not found");

    if (category._count.listings > 0 || category._count.package_line_items > 0) {
        throw new ApiError(
            409,
            `Cannot delete category: linked to ${category._count.listings} listing(s) and ${category._count.package_line_items} package line item(s)`
        );
    }

    await prisma.category.delete({ where: { id: categoryId } });

    return res.status(200).json(new ApiResponse(200, null, "Category deleted successfully"));
});

export {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};
