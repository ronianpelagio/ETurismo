import { supabase } from "./supabase";

export type PushNotificationInput = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function sendPushNotification(
  input: PushNotificationInput,
): Promise<void> {
  const { error } = await supabase.functions.invoke("send-push-notification", {
    body: input,
  });

  if (error) {
    throw new Error(error.message || "Push notification delivery failed.");
  }
}
