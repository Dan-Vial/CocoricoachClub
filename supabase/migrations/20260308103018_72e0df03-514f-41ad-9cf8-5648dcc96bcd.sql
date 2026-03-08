DELETE FROM conversation_participants WHERE conversation_id = '91f52aa1-a365-4075-ab33-83663e2e58f0';
DELETE FROM conversations WHERE id = '91f52aa1-a365-4075-ab33-83663e2e58f0';
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_group_conversation_name ON conversations (category_id, name) WHERE conversation_type = 'group' AND name IS NOT NULL;