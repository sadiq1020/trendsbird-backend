import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { AttributeController } from './attribute.controller';
import {
  addAttributeValuesSchema,
  attributeIdParamsSchema,
  attributeValueParamsSchema,
  createAttributeSchema,
  listAttributeQuerySchema,
  updateAttributeSchema,
  updateAttributeValueSchema,
} from './attribute.schema';

const router = Router();
const controller = new AttributeController();

router.use(authGuard);

router.get(
  '/',
  permissionGuard('attribute:read'),
  validateRequest({ query: listAttributeQuerySchema }),
  asyncHandler(controller.listAttributes.bind(controller))
);

router.post(
  '/',
  permissionGuard('attribute:create'),
  validateRequest({ body: createAttributeSchema }),
  asyncHandler(controller.createAttribute.bind(controller))
);

router.get(
  '/:id',
  permissionGuard('attribute:read'),
  validateRequest({ params: attributeIdParamsSchema }),
  asyncHandler(controller.getAttribute.bind(controller))
);

router.patch(
  '/:id',
  permissionGuard('attribute:update'),
  validateRequest({ params: attributeIdParamsSchema, body: updateAttributeSchema }),
  asyncHandler(controller.updateAttribute.bind(controller))
);

router.post(
  '/:id/values',
  permissionGuard('attribute:update'),
  validateRequest({ params: attributeIdParamsSchema, body: addAttributeValuesSchema }),
  asyncHandler(controller.addValues.bind(controller))
);

router.patch(
  '/:id/values/:valueId',
  permissionGuard('attribute:update'),
  validateRequest({ params: attributeValueParamsSchema, body: updateAttributeValueSchema }),
  asyncHandler(controller.updateValue.bind(controller))
);

router.delete(
  '/:id/values/:valueId',
  permissionGuard('attribute:delete'),
  validateRequest({ params: attributeValueParamsSchema }),
  asyncHandler(controller.deleteValue.bind(controller))
);

router.delete(
  '/:id',
  permissionGuard('attribute:delete'),
  validateRequest({ params: attributeIdParamsSchema }),
  asyncHandler(controller.deleteAttribute.bind(controller))
);

export const attributeRoutes = router;
