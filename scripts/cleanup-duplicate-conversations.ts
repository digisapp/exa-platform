import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupDuplicates() {
  console.log("Finding duplicate empty conversations...");

  // Get all direct conversations with their participants
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(`
      id,
      created_at,
      conversation_participants(actor_id)
    `)
    .eq("type", "direct");

  if (error) {
    console.error("Error fetching conversations:", error);
    return;
  }

  // Group by participant pair
  const pairMap = new Map<string, { id: string; created_at: string }[]>();

  for (const conv of conversations || []) {
    const participants = conv.conversation_participants as { actor_id: string }[];
    if (participants.length !== 2) continue;

    const actorIds = participants.map(p => p.actor_id).sort();
    const key = `${actorIds[0]}_${actorIds[1]}`;

    if (!pairMap.has(key)) {
      pairMap.set(key, []);
    }
    pairMap.get(key)!.push({ id: conv.id, created_at: conv.created_at });
  }

  // Find duplicates (pairs with more than one conversation)
  const toDelete: string[] = [];

  for (const [key, convs] of pairMap) {
    if (convs.length > 1) {
      // Sort by created_at, keep oldest
      convs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Check which ones have messages
      for (let i = 0; i < convs.length; i++) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convs[i].id);

        if (count === 0 && i > 0) {
          // Empty and not the oldest - delete it
          toDelete.push(convs[i].id);
        } else if (count && count > 0 && i > 0) {
          console.log(`Conversation ${convs[i].id} has ${count} messages, skipping`);
        }
      }
    }
  }

  console.log(`Found ${toDelete.length} empty duplicate conversations to delete`);

  if (toDelete.length > 0) {
    // Delete participants first (foreign key)
    const { error: partError } = await supabase
      .from("conversation_participants")
      .delete()
      .in("conversation_id", toDelete);

    if (partError) {
      console.error("Error deleting participants:", partError);
      return;
    }

    // Delete conversations
    const { error: convError } = await supabase
      .from("conversations")
      .delete()
      .in("id", toDelete);

    if (convError) {
      console.error("Error deleting conversations:", convError);
      return;
    }

    console.log(`Deleted ${toDelete.length} duplicate conversations`);
  }
}

cleanupDuplicates().catch(console.error);
