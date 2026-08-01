import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { BrandController } from './brand.controller';
import {
  brandIdParamsSchema,
  createBrandSchema,
  listBrandQuerySchema,
  updateBrandSchema,
} from './brand.schema';

const router = Router();
const controller = new BrandController();

router.use(authGuard);

router.get(
  '/',
  permissionGuard('brand:read'),
  validateRequest({ query: listBrandQuerySchema }),
  asyncHandler(controller.listBrands.bind(controller))
);

router.post(
  '/',
  permissionGuard('brand:create'),
  validateRequest({ body: createBrandSchema }),
  asyncHandler(controller.createBrand.bind(controller))
);

router.get(
  '/:id',
  permissionGuard('brand:read'),
  validateRequest({ params: brandIdParamsSchema }),
  asyncHandler(controller.getBrand.bind(controller))
);

router.patch(
  '/:id',
  permissionGuard('brand:update'),
  validateRequest({ params: brandIdParamsSchema, body: updateBrandSchema }),
  asyncHandler(controller.updateBrand.bind(controller))
);

router.delete(
  '/:id',
  permissionGuard('brand:delete'),
  validateRequest({ params: brandIdParamsSchema }),
  asyncHandler(controller.deleteBrand.bind(controller))
);

export const brandRoutes = router;
