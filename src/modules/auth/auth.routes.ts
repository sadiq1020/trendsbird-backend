import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateRequest } from '../../common/middlewares/validate';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { AuthController } from './auth.controller';
import { loginSchema } from './auth.schema';

const router = Router();
const controller = new AuthController();

// Rate limiter for login route to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    error: { code: 'TOO_MANY_REQUESTS' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Auth Routes
router.post(
  '/login',
  loginLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(controller.login.bind(controller))
);

router.post('/refresh', asyncHandler(controller.refresh.bind(controller)));
router.post('/logout', asyncHandler(controller.logout.bind(controller)));

// Protected Auth Session Route
router.get('/session', asyncHandler(controller.getSession.bind(controller)));

export const authRoutes = router;
