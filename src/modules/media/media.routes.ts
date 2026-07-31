import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { upload } from '../../common/middlewares/upload';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { MediaController } from './media.controller';
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  updateMediaMetaSchema,
} from './media.schema';

const router = Router();
const controller = new MediaController();

router.use(authGuard);

router.get(
  '/',
  permissionGuard('media:read'),
  validateRequest({ query: listMediaQuerySchema }),
  asyncHandler(controller.listMedia.bind(controller))
);

router.post(
  '/upload',
  permissionGuard('media:upload'),
  upload.any(),
  asyncHandler(controller.uploadFiles.bind(controller))
);

router.get(
  '/:id',
  permissionGuard('media:read'),
  validateRequest({ params: mediaIdParamsSchema }),
  asyncHandler(controller.getMedia.bind(controller))
);

router.patch(
  '/:id',
  permissionGuard('media:write'),
  validateRequest({ params: mediaIdParamsSchema, body: updateMediaMetaSchema }),
  asyncHandler(controller.updateMediaMeta.bind(controller))
);

router.delete(
  '/:id',
  permissionGuard('media:delete'),
  validateRequest({ params: mediaIdParamsSchema }),
  asyncHandler(controller.deleteMedia.bind(controller))
);

export const mediaRoutes = router;
