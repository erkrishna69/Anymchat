import { Request, Response } from 'express';
import { ReferralService } from '../../services/referral/referral.service';
import { UserRepository } from '../../repositories/user/user.repository';

export class ReferralController {
  /** GET /api/v1/referrals/me — return current user's referral code + invite URL */
  public static async getMyReferral(req: Request, res: Response): Promise<void> {
    try {
      const anonymousId = (req as any).user?.anonymousId;
      if (!anonymousId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await UserRepository.findByAnonymousId(anonymousId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // If user has no referral code yet, generate one and persist it
      let referralCode = user.referralCode;
      if (!referralCode) {
        referralCode = await ReferralService.getOrCreateCode(anonymousId);
        await UserRepository.setReferralCode(anonymousId, referralCode);
      }

      const info = await ReferralService.getMyReferralInfo(anonymousId, referralCode);
      res.json({ success: true, ...info });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /** GET /api/v1/referrals/:code — validate a referral code (used by /invite page) */
  public static async validateCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const resolved = await ReferralService.resolveCode(code);
      if (!resolved) {
        res.status(404).json({ success: false, error: 'Invalid referral code' });
        return;
      }
      res.json({ success: true, referralCode: resolved.referralCode });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /** POST /api/v1/referrals/:code/open — record link-opened event (rate-limited) */
  public static async recordOpen(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown';
      await ReferralService.recordOpen(code, ip);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
