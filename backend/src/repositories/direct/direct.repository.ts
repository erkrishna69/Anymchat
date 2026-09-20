import { DirectMessageModel } from '../../models/directMessage/directMessage.model';
import { getMongoConnectionStatus } from '../../config/database/mongo.config';
import { ENV } from '../../config/env/env.config';
import { v4 as uuidv4 } from 'uuid';

const inMemoryDirects: any[] = [];

export class DirectRepository {
  public static async createMessage(msg: {
    senderAnonymousId: string;
    recipientAnonymousId: string;
    clientMessageId?: string;
    content: string;
    createdAt?: Date;
  }): Promise<any> {
    const createdAt = msg.createdAt || new Date();
    const doc = {
      senderAnonymousId: msg.senderAnonymousId,
      recipientAnonymousId: msg.recipientAnonymousId,
      clientMessageId: msg.clientMessageId,
      content: msg.content,
      isRead: false,
      createdAt,
    };

    if (getMongoConnectionStatus()) {
      try {
        return await DirectMessageModel.create(doc);
      } catch (err: any) {
        // E11000 Duplicate Key Handling
        if (err.code === 11000 && msg.clientMessageId) {
          try {
            const existing = await DirectMessageModel.findOne({
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

    // In-Memory Idempotency check
    if (msg.clientMessageId) {
      const existingMem = inMemoryDirects.find(
        (m) => m.senderAnonymousId === msg.senderAnonymousId && m.clientMessageId === msg.clientMessageId
      );
      if (existingMem) {
        return existingMem;
      }
    }

    const memoryItem = {
      ...doc,
      _id: uuidv4(),
    };
    inMemoryDirects.push(memoryItem);

    // Auto prune memory items older than 24h
    const cutoff24h = Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000;
    while (inMemoryDirects.length > 0 && new Date(inMemoryDirects[0].createdAt).getTime() < cutoff24h) {
      inMemoryDirects.shift();
    }
    if (inMemoryDirects.length > 5000) {
      inMemoryDirects.splice(0, inMemoryDirects.length - 5000);
    }

    return memoryItem;
  }

  public static async getConversation(
    userA: string,
    userB: string,
    limit: number = 50
  ): Promise<any[]> {
    const cutoff24h = new Date(Date.now() - ENV.MESSAGE_TTL_SECONDS * 1000);

    if (getMongoConnectionStatus()) {
      try {
        return await DirectMessageModel.find({
          $or: [
            { senderAnonymousId: userA, recipientAnonymousId: userB },
            { senderAnonymousId: userB, recipientAnonymousId: userA },
          ],
          createdAt: { $gte: cutoff24h }, // Strict 24-hour guard
        })
          .sort({ createdAt: 1 })
          .limit(limit);
      } catch (err) {
        // fallback
      }
    }

    const cutoffMs = cutoff24h.getTime();
    return inMemoryDirects
      .filter((m) => {
        const t = new Date(m.createdAt).getTime();
        if (t < cutoffMs) return false;
        return (
          (m.senderAnonymousId === userA && m.recipientAnonymousId === userB) ||
          (m.senderAnonymousId === userB && m.recipientAnonymousId === userA)
        );
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit);
  }

  public static async markAsRead(recipientAnonymousId: string, senderAnonymousId: string): Promise<void> {
    if (getMongoConnectionStatus()) {
      try {
        await DirectMessageModel.updateMany(
          { senderAnonymousId, recipientAnonymousId, isRead: false },
          { $set: { isRead: true } }
        );
        return;
      } catch (err) {
        // fallback
      }
    }

    for (const m of inMemoryDirects) {
      if (m.senderAnonymousId === senderAnonymousId && m.recipientAnonymousId === recipientAnonymousId) {
        m.isRead = true;
      }
    }
  }

  /**
   * Used by the Hourly Archival Job to fetch all direct messages in a specific time window
   */
  public static async getMessagesByTimeWindow(startTime: Date, endTime: Date): Promise<any[]> {
    if (getMongoConnectionStatus()) {
      try {
        return await DirectMessageModel.find({
          createdAt: { $gte: startTime, $lt: endTime },
        }).sort({ createdAt: 1 });
      } catch {
        // fallback
      }
    }

    const startMs = startTime.getTime();
    const endMs = endTime.getTime();
    return inMemoryDirects
      .filter((m) => {
        const t = new Date(m.createdAt).getTime();
        return t >= startMs && t < endMs;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

