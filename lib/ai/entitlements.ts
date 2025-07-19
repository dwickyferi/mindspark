import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';
import { chatModelIds } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    // ✨ Automatically includes all available models from centralized config
    availableChatModelIds: chatModelIds,
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
