import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { ProductController } from './product.controller';
import {
  createProductSchema,
  listProductQuerySchema,
  productIdParamsSchema,
  updateProductSchema,
} from './product.schema';

const router = Router();
const controller = new ProductController();

router.use(authGuard);

router.get(
  '/',
  permissionGuard('product:read'),
  validateRequest({ query: listProductQuerySchema }),
  asyncHandler(controller.listProducts.bind(controller))
);

router.post(
  '/',
  permissionGuard('product:create'),
  validateRequest({ body: createProductSchema }),
  asyncHandler(controller.createProduct.bind(controller))
);

router.get(
  '/:id',
  permissionGuard('product:read'),
  validateRequest({ params: productIdParamsSchema }),
  asyncHandler(controller.getProduct.bind(controller))
);

router.patch(
  '/:id',
  permissionGuard('product:update'),
  validateRequest({ params: productIdParamsSchema, body: updateProductSchema }),
  asyncHandler(controller.updateProduct.bind(controller))
);

router.delete(
  '/:id',
  permissionGuard('product:delete'),
  validateRequest({ params: productIdParamsSchema }),
  asyncHandler(controller.deleteProduct.bind(controller))
);

export const productRoutes = router;
