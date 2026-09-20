import { DirectRepository } from '../../repositories/direct/direct.repository';
import { SafetyRepository } from '../../repositories/safety/safety.repository';
import { IPublicDirectMessage } from '../../types/direct/directMessage.types';

export class DirectChatService {
  public static async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    clientMessageId?: string
  ): Promise<{ success: boolean; message?: IPublicDirectMessage; error?: string }> {
    // Check if either party blocked the other
    const isBlocked = await SafetyRepository.isUserBlocked(senderId, recipientId);
    if (isBlocked) {
      return { success: false, error: 'Communication not permitted between these users.' };
    }

    const created = await DirectRepository.createMessage({
      senderAnonymousId: senderId,
      recipientAnonymousId: recipientId,
      clientMessageId,
      content,
    });

    const publicMsg: IPublicDirectMessage = {
      id: created._id.toString(),
      senderAnonymousId: created.senderAnonymousId,
      recipientAnonymousId: created.recipientAnonymousId,
      content: created.content,
      isRead: created.isRead,
      createdAt: new Date(created.createdAt).toISOString(),
      isMine: true,
    };

    return { success: true, message: publicMsg };
  }

  public static async getChatHistory(
    currentUserId: string,
    otherUserId: string
  ): Promise<IPublicDirectMessage[]> {
    const rawList = await DirectRepository.getConversation(currentUserId, otherUserId);

    return rawList.map((m) => ({
      id: m._id.toString(),
      senderAnonymousId: m.senderAnonymousId,
      recipientAnonymousId: m.recipientAnonymousId,
      content: m.content,
      isRead: m.isRead,
      createdAt: new Date(m.createdAt).toISOString(),
      isMine: m.senderAnonymousId === currentUserId,
    }));
  }

  public static async markMessagesRead(recipientId: string, senderId: string): Promise<void> {
    await DirectRepository.markAsRead(recipientId, senderId);
  }
}
