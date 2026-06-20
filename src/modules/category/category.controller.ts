import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schema';

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ success: true, data: categories });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as CreateCategoryInput;
  const category = await prisma.category.create({ data });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as UpdateCategoryInput;
  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Category deleted' });
});
