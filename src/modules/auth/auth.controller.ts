import { Request, Response } from 'express';
import { env } from '../../config/env';
import { sendSuccess } from '../../common/utils/response';
import { AppError } from '../../common/middlewares/error-handler';
import { AuthService } from './auth.service';

const authService = new AuthService();

const isProduction = env.NODE_ENV === 'production';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
});

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const options = getCookieOptions();
  res.cookie('accessToken', accessToken, {
    ...options,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    ...options,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

const clearAuthCookies = (res: Response) => {
  const options = getCookieOptions();
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
};

export class AuthController {
  async login(req: Request, res: Response): Promise<Response> {
    const result = await authService.login(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    // Also include tokens in body for Postman / mobile / cross-origin client flexibility
    return sendSuccess(res, 200, 'Login successful', {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  async refresh(req: Request, res: Response): Promise<Response> {
    // Extract refresh token from cookie or request body (for Postman & cross-origin convenience)
    let rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken) {
      throw new AppError('Refresh token is required', 401, 'UNAUTHORIZED');
    }

    const result = await authService.refresh(rawRefreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return sendSuccess(res, 200, 'Token refreshed successfully', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  async logout(req: Request, res: Response): Promise<Response> {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(rawRefreshToken);
    clearAuthCookies(res);

    return sendSuccess(res, 200, 'Logged out successfully');
  }

  async getSession(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw new AppError('Unauthorized: Session user not found', 401, 'UNAUTHORIZED');
    }

    const sessionUser = await authService.getSession(req.user.id);
    return sendSuccess(res, 200, 'Session retrieved successfully', {
      user: sessionUser,
      role: sessionUser.role,
      permissions: sessionUser.permissions,
    });
  }
}
