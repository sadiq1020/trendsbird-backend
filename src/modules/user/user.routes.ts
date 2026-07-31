import { Router } from 'express';
import { authGuard } from '../../common/middlewares/auth.guard';
import { permissionGuard } from '../../common/middlewares/permission.guard';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { UserController } from './user.controller';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamsSchema,
} from './user.schema';

const router = Router();
const controller = new UserController();

router.use(authGuard);

router.get(
  '/',
  permissionGuard('user:read'),
  validateRequest({ query: listUsersQuerySchema }),
  asyncHandler(controller.listUsers.bind(controller))
);

router.post(
  '/',
  permissionGuard('user:create'),
  validateRequest({ body: createUserSchema }),
  asyncHandler(controller.createUser.bind(controller))
);

router.get(
  '/:id',
  permissionGuard('user:read'),
  validateRequest({ params: userIdParamsSchema }),
  asyncHandler(controller.getUser.bind(controller))
);

router.patch(
  '/:id',
  permissionGuard('user:update'),
  validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
  asyncHandler(controller.updateUser.bind(controller))
);

router.delete(
  '/:id',
  permissionGuard('user:delete'),
  validateRequest({ params: userIdParamsSchema }),
  asyncHandler(controller.deleteUser.bind(controller))
);

export const userRoutes = router;
