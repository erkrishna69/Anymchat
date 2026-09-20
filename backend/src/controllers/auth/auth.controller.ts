import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth/auth.middleware';
import { AuthService } from '../../services/auth/auth.service';
import { HTTP_STATUS } from '../../constants/status/httpStatus.constants';

export class AuthController {
  public static async createAnonymousUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { alias, avatarId, gender } = req.body || {};
      const result = await AuthService.createAnonymousUser({
        alias,
        avatarId: avatarId ? parseInt(avatarId as string, 10) : undefined,
        gender,
      });
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        user: {
          anonymousId: result.user.anonymousId,
          alias: result.user.alias,
          avatarColor: result.user.avatarColor,
          avatarId: result.user.avatarId,
          gender: result.user.gender,
        },
        token: result.token,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  public static async generateName(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { seed, avatarId, gender } = req.query;
      const alias = await AuthService.generateUniqueName(
        seed as string | undefined,
        avatarId ? parseInt(avatarId as string, 10) : undefined,
        gender as 'male' | 'female' | 'other' | undefined
      );
      res.status(HTTP_STATUS.OK).json({
        success: true,
        alias,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  public static async signup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, avatarId, alias, gender, referredBy } = req.body;
      const result = await AuthService.signup(
        email,
        password,
        avatarId ? parseInt(avatarId, 10) : 1,
        alias,
        gender as 'male' | 'female' | 'other' | undefined,
        referredBy as string | undefined
      );
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: error.message,
      });
    }
  }

  public static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: error.message,
      });
    }
  }

  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        return;
      }
      const user = await AuthService.authenticateToken(req.headers.authorization!.split(' ')[1]);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        user: {
          anonymousId: user.anonymousId,
          alias: user.alias,
          avatarColor: user.avatarColor,
          email: user.email,
        },
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  public static async updateAlias(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Anonymous handles are permanent and cannot be modified.',
      });
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  public static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.anonymousId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const result = await AuthService.deleteAccount(req.user.anonymousId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }
}
