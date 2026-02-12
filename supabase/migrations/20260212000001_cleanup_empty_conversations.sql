-- Delete conversations that have zero messages and no active/pending call sessions
DELETE FROM conversations
WHERE id IN (
  SELECT c.id
  FROM conversations c
  LEFT JOIN messages m ON m.conversation_id = c.id
  LEFT JOIN video_call_sessions v ON v.conversation_id = c.id
    AND v.status IN ('pending', 'active')
  WHERE m.id IS NULL
    AND v.id IS NULL
);
