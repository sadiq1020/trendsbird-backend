import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { CategoryController } from './category.controller';
import {
  categoryIdParamsSchema,
  createCategorySchema,
  listCategoryQuerySchema,
  updateCategorySchema,
} from './category.schema';

const router = Router();
const controller = new CategoryController();

router.use(authGuard);

router.get(
  '/tree',
  permissionGuard('category:read'),
  asyncHandler(controller.getCategoryTree.bind(controller))
);

router.get(
  '/',
  permissionGuard('category:read'),
  validateRequest({ query: listCategoryQuerySchema }),
  asyncHandler(controller.listCategories.bind(controller))
);

router.post(
  '/',
  permissionGuard('category:create'),
  validateRequest({ body: createCategorySchema }),
  asyncHandler(controller.createCategory.bind(controller))
);

router.get(
  '/:id',
  permissionGuard('category:read'),
  validateRequest({ params: categoryIdParamsSchema }),
  asyncHandler(controller.getCategory.bind(controller))
);

router.patch(
  '/:id',
  permissionGuard('category:update'),
  validateRequest({ params: categoryIdParamsSchema, body: updateCategorySchema }),
  asyncHandler(controller.updateCategory.bind(controller))
);

router.delete(
  '/:id',
  permissionGuard('category:delete'),
  validateRequest({ params: categoryIdParamsSchema }),
  asyncHandler(controller.deleteCategory.bind(controller))
);

export const categoryRoutes = router;
