import { FeedMessageModel } from '../../models/feedMessage/feedMessage.model';
import { getMongoConnectionStatus } from '../../config/database/mongo.config';
import { DISTANCE_CONSTANTS } from '../../constants/distance/distance.constants';
import { HaversineService } from '../../services/geo/haversine.service';
import { FeedCacheService } from '../../services/cache/feedCache.service';
import { ENV } from '../../config/env/env.config';
import { v4 as uuidv4 } from 'uuid';

const inMemoryFeed: any[] = [];

export class FeedRepository {
  public static async createMessage(msg: {
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
    createdAt?: Date;
  }): Promise<any> {
    const createdAt = msg.createdAt || new Date();
    const doc = {
      senderAnonymousId: msg.senderAnonymousId,
      senderAlias: msg.senderAlias,
      senderAvatarColor: msg.senderAvatarColor,
      senderGender: msg.senderGender || 'other',
      avatarId: msg.avatarId || 1,
      clientMessageId: msg.clientMessageId,
      content: msg.content,
      replyTo: msg.replyTo,
      location: {
        type: 'Point',
        coordinates: [msg.longitude, msg.latitude], // GeoJSON [lng, lat]
      },
      createdAt,
    };

    let resultDoc: any = null;

    if (getMongoConnectionStatus()) {
      try {
        resultDoc = await FeedMessageModel.create(doc);
      } catch (err: any) {
        // E11000 Duplicate Key Handling (senderAnonymousId + clientMessageId already inserted)
        if (err.code === 11000 && msg.clientMessageId) {
          try {
            const existing = await FeedMessageModel.findOne({
              senderAnonymousId: msg.senderAnonymousId,
              clientMessageId: msg.clientMessageId,
            });
            if (existing) {
              return existing;
            }
          } catch {
            /* ignore */
          }
        }
      }
    }

    if (!resultDoc) {
      // In-Memory Idempotency check
      if (msg.clientMessageId) {
        const existingMem = inMemoryFeed.find(
          (m) => m.senderAnonymousId === msg.senderAnonymousId && m.clientMessageId === msg.clientMessageId
        );
        if (existingMem) {
          return existingMem;
        }
      }

      resultDoc = {
        ...doc,
        _id: uuidv4(),
      };
      inMemoryFeed.unshift(resultDoc);
      // Auto prune memory items older than 24h
      const cutoff24h = Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000;
      while (inMemoryFeed.length > 0 && new Date(inMemoryFeed[inMemoryFeed.length - 1].createdAt).getTime() < cutoff24h) {
        inMemoryFeed.pop();
      }
      if (inMemoryFeed.length > 5000) {
        inMemoryFeed.splice(5000);
      }
    }

    // Cache in Redis Sorted Set for instant sub-millisecond retrieval
    try {
      await FeedCacheService.cacheMessage({
        id: (resultDoc._id || resultDoc.id).toString(),
        senderAnonymousId: resultDoc.senderAnonymousId,
        senderAlias: resultDoc.senderAlias,
        senderAvatarColor: resultDoc.senderAvatarColor,
        senderGender: resultDoc.senderGender,
        avatarId: resultDoc.avatarId,
        content: resultDoc.content,
        replyTo: resultDoc.replyTo,
        createdAt: new Date(resultDoc.createdAt).toISOString(),
        proximityTag: 'Nearby (< 10km)',
        latitude: msg.latitude,
        longitude: msg.longitude,
      });
    } catch {
      // Non-blocking cache write
    }

    return resultDoc;
  }

  public static async getNearbyMessages(
    latitude: number,
    longitude: number,
    radiusKm: number = DISTANCE_CONSTANTS.DEFAULT_RADIUS_KM,
    limit: number = 60
  ): Promise<any[]> {
    const cutoff24h = new Date(Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000);

    if (getMongoConnectionStatus()) {
      try {
        const radiusInRadians = radiusKm / DISTANCE_CONSTANTS.EARTH_RADIUS_KM;
        return await FeedMessageModel.find({
          location: {
            $geoWithin: {
              $centerSphere: [[longitude, latitude], radiusInRadians],
            },
          },
          createdAt: { $gte: cutoff24h }, // Strict 24-Hour Ephemeral Guard
        })
          .sort({ createdAt: -1 })
          .limit(limit);
      } catch (err) {
        // fallback
      }
    }

    // In-Memory Filter with 24-Hour Ephemeral Guard
    const cutoffTimestamp = cutoff24h.getTime();
    return inMemoryFeed
      .filter((m) => {
        const msgTime = new Date(m.createdAt).getTime();
        if (msgTime < cutoffTimestamp) return false;
        const [msgLng, msgLat] = m.location.coordinates;
        return HaversineService.isNearby(latitude, longitude, msgLat, msgLng, radiusKm);
      })
      .slice(0, limit);
  }

  /**
   * Used by the Hourly Archival Job to fetch all messages in a specific time window
   */
  public static async getMessagesByTimeWindow(startTime: Date, endTime: Date): Promise<any[]> {
    if (getMongoConnectionStatus()) {
      try {
        return await FeedMessageModel.find({
          createdAt: { $gte: startTime, $lt: endTime },
        }).sort({ createdAt: 1 });
      } catch {
        // fallback
      }
    }

    const startMs = startTime.getTime();
    const endMs = endTime.getTime();
    return inMemoryFeed
      .filter((m) => {
        const t = new Date(m.createdAt).getTime();
        return t >= startMs && t < endMs;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

