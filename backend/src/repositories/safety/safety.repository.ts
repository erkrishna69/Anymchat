import { ReportModel } from '../../models/report/report.model';
import { BlockModel } from '../../models/block/block.model';
import { getMongoConnectionStatus } from '../../config/database/mongo.config';
import { v4 as uuidv4 } from 'uuid';

const inMemoryReports: any[] = [];
const inMemoryBlocks = new Set<string>(); // "blocker:blocked"

export class SafetyRepository {
  public static async createReport(report: {
    reporterAnonymousId: string;
    reportedAnonymousId: string;
    messageId?: string;
    reason: string;
    additionalDetails?: string;
  }): Promise<any> {
    const doc = {
      ...report,
      createdAt: new Date(),
    };

    if (getMongoConnectionStatus()) {
      try {
        return await ReportModel.create(doc);
      } catch (err) {
        // fallback
      }
    }

    const memoryDoc = { ...doc, _id: uuidv4() };
    inMemoryReports.push(memoryDoc);
    return memoryDoc;
  }

  public static async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (getMongoConnectionStatus()) {
      try {
        await BlockModel.findOneAndUpdate(
          { blockerAnonymousId: blockerId, blockedAnonymousId: blockedId },
          { blockerAnonymousId: blockerId, blockedAnonymousId: blockedId },
          { upsert: true }
        );
        return true;
      } catch (err) {
        // fallback
      }
    }

    inMemoryBlocks.add(`${blockerId}:${blockedId}`);
    return true;
  }

  public static async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (getMongoConnectionStatus()) {
      try {
        await BlockModel.deleteOne({ blockerAnonymousId: blockerId, blockedAnonymousId: blockedId });
        return true;
      } catch (err) {
        // fallback
      }
    }

    inMemoryBlocks.delete(`${blockerId}:${blockedId}`);
    return true;
  }

  public static async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    if (getMongoConnectionStatus()) {
      try {
        const found = await BlockModel.findOne({
          $or: [
            { blockerAnonymousId: blockerId, blockedAnonymousId: blockedId },
            { blockerAnonymousId: blockedId, blockedAnonymousId: blockerId },
          ],
        });
        return !!found;
      } catch (err) {
        // fallback
      }
    }

    return (
      inMemoryBlocks.has(`${blockerId}:${blockedId}`) ||
      inMemoryBlocks.has(`${blockedId}:${blockerId}`)
    );
  }

  public static async getBlockedUserIds(blockerId: string): Promise<string[]> {
    if (getMongoConnectionStatus()) {
      try {
        const blocks = await BlockModel.find({ blockerAnonymousId: blockerId });
        return blocks.map((b) => b.blockedAnonymousId);
      } catch (err) {
        // fallback
      }
    }

    const blocked: string[] = [];
    for (const key of inMemoryBlocks) {
      const [blocker, target] = key.split(':');
      if (blocker === blockerId) {
        blocked.push(target);
      }
    }
    return blocked;
  }
}
