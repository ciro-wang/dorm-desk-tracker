import type { Notification } from "@/lib/alerts/format";

export interface Notifier {
  send(n: Notification): Promise<void>;
}

/**
 * Publishes through ntfy's JSON API (avoids HTTP header encoding issues with non-ASCII titles).
 * The topic name is the secret: it is never logged.
 */
export function ntfyNotifier(topicUrl: string): Notifier {
  const u = new URL(topicUrl);
  const topic = u.pathname.replace(/^\/+|\/+$/g, "");
  const server = `${u.origin}/`;
  return {
    async send(n) {
      const res = await fetch(server, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, title: n.title, message: n.message, click: n.clickUrl, priority: n.priority, tags: ["shopping_cart"] }),
      });
      if (!res.ok) throw new Error(`ntfy publish failed: ${res.status}`);
    },
  };
}
