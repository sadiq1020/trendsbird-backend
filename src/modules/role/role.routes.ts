import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { RoleController } from './role.controller';
import {
  addRolePermissionsSchema,
  createRoleSchema,
  listRolesQuerySchema,
  roleIdParamsSchema,
  rolePermissionParamsSchema,
  updateRoleSchema,
} from './role.schema';

const router = Router();
const controller = new RoleController();

router.use(authGuard);

router.get(
  '/',
  permissionGuard('role:read'),
  validateRequest({ query: listRolesQuerySchema }),
  asyncHandler(controller.listRoles.bind(controller))
);

router.post(
  '/',
  permissionGuard('role:create'),
  validateRequest({ body: createRoleSchema }),
  asyncHandler(controller.createRole.bind(controller))
);

router.get(
  '/:id',
  permissionGuard('role:read'),
  validateRequest({ params: roleIdParamsSchema }),
  asyncHandler(controller.getRole.bind(controller))
);

router.patch(
  '/:id',
  permissionGuard('role:update'),
  validateRequest({ params: roleIdParamsSchema, body: updateRoleSchema }),
  asyncHandler(controller.updateRole.bind(controller))
);

router.post(
  '/:id/permissions',
  permissionGuard('role:update'),
  validateRequest({ params: roleIdParamsSchema, body: addRolePermissionsSchema }),
  asyncHandler(controller.addPermissions.bind(controller))
);

router.delete(
  '/:id/permissions/:permissionId',
  permissionGuard('role:update'),
  validateRequest({ params: rolePermissionParamsSchema }),
  asyncHandler(controller.removePermission.bind(controller))
);

router.delete(
  '/:id',
  permissionGuard('role:delete'),
  validateRequest({ params: roleIdParamsSchema }),
  asyncHandler(controller.deleteRole.bind(controller))
);

export const roleRoutes = router;
