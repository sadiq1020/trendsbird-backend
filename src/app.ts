import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { sendSuccess } from './common/utils/response';
import { errorHandler } from './common/middlewares/error-handler';
import { authRoutes } from './modules/auth/auth.routes';
import { permissionRoutes } from './modules/permission/permission.routes';
import { roleRoutes } from './modules/role/role.routes';
import { userRoutes } from './modules/user/user.routes';
import { mediaRoutes } from './modules/media/media.routes';
import { categoryRoutes } from './modules/category/category.routes';
import { brandRoutes } from './modules/brand/brand.routes';
import { attributeRoutes } from './modules/attribute/attribute.routes';
import { productRoutes } from './modules/product/product.routes';

const app: Application = express();

// Global Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/api/v1/health', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Trendsbird Backend API is healthy', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/attributes', attributeRoutes);
app.use('/api/v1/products', productRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
