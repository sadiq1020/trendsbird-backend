import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { PermissionController } from './permission.controller';
import {
    addActionsBodySchema,
    createPermissionGroupBodySchema,
    groupIdParamsSchema,
    listPermissionGroupsQuerySchema,
    removeActionParamsSchema,
    updatePermissionGroupBodySchema,
} from './permission.schema';

const router = Router();
const controller = new PermissionController();

router.use(authGuard);

router.get(
  '/groups',
  permissionGuard('permission:read'),
  validateRequest({ query: listPermissionGroupsQuerySchema }),
  asyncHandler(controller.listGroups.bind(controller))
);

router.post(
  '/groups',
  permissionGuard('permission:create'),
  validateRequest({ body: createPermissionGroupBodySchema }),
  asyncHandler(controller.createGroup.bind(controller))
);

router.get(
  '/groups/:id',
  permissionGuard('permission:read'),
  validateRequest({ params: groupIdParamsSchema }),
  asyncHandler(controller.getGroup.bind(controller))
);

router.patch(
  '/groups/:id',
  permissionGuard('permission:update'),
  validateRequest({ params: groupIdParamsSchema, body: updatePermissionGroupBodySchema }),
  asyncHandler(controller.updateGroup.bind(controller))
);

router.post(
  '/groups/:id/actions',
  permissionGuard('permission:update'),
  validateRequest({ params: groupIdParamsSchema, body: addActionsBodySchema }),
  asyncHandler(controller.addActions.bind(controller))
);

router.delete(
  '/groups/:id/actions/:permissionId',
  permissionGuard('permission:delete'),
  validateRequest({ params: removeActionParamsSchema }),
  asyncHandler(controller.removeAction.bind(controller))
);

router.delete(
  '/groups/:id',
  permissionGuard('permission:delete'),
  validateRequest({ params: groupIdParamsSchema }),
  asyncHandler(controller.deleteGroup.bind(controller))
);

export const permissionRoutes = router;