import { FeedRepository } from '../../repositories/feed/feed.repository';
import { SafetyRepository } from '../../repositories/safety/safety.repository';
import { IPublicFeedMessage } from '../../types/feed/feedMessage.types';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';

export class FeedService {
  public static async postMessage(params: {
    senderAnonymousId: string;
    senderAlias: string;
    senderAvatarColor: string;
    senderGender?: 'male' | 'female' | 'other';
    avatarId?: number;
    clientMessageId?: string;
    content: string;
    replyTo?: {
      messageId: string;
      senderAlias: string;
      content: string;
    };
    latitude: number;
    longitude: number;
  }): Promise<IPublicFeedMessage> {
    const raw = await FeedRepository.createMessage(params);

    // Sanitize message: exclude coordinates!
    return {
      id: raw._id.toString(),
      senderAnonymousId: raw.senderAnonymousId,
      senderAlias: raw.senderAlias,
      senderAvatarColor: raw.senderAvatarColor,
      senderGender: raw.senderGender,
      avatarId: raw.avatarId,
      content: raw.content,
      replyTo: raw.replyTo ? {
        messageId: raw.replyTo.messageId,
        senderAlias: raw.replyTo.senderAlias,
        content: raw.replyTo.content,
      } : undefined,
      createdAt: new Date(raw.createdAt).toISOString(),
      proximityTag: 'Nearby (< 10km)',
    };
  }

  public static async getNearbyFeed(
    viewerAnonymousId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM
  ): Promise<IPublicFeedMessage[]> {
    const blockedUserIds = await SafetyRepository.getBlockedUserIds(viewerAnonymousId);
    const messages = await FeedRepository.getNearbyMessages(latitude, longitude, radiusKm, 60);

    return messages
      .filter((m) => !blockedUserIds.includes(m.senderAnonymousId))
      .map((m) => ({
        id: m._id.toString(),
        senderAnonymousId: m.senderAnonymousId,
        senderAlias: m.senderAlias,
        senderAvatarColor: m.senderAvatarColor,
        senderGender: m.senderGender,
        avatarId: m.avatarId,
        content: m.content,
        replyTo: m.replyTo ? {
          messageId: m.replyTo.messageId,
          senderAlias: m.replyTo.senderAlias,
          content: m.replyTo.content,
        } : undefined,
        createdAt: new Date(m.createdAt).toISOString(),
        proximityTag: 'Nearby (< 10km)',
      }));
  }
}
