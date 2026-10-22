-- Canonical rehearsal only. Binding captures first authenticated entry, never retroactive.
CREATE TABLE IF NOT EXISTS akai_boss_v18_bindings(realm_id uuid NOT NULL REFERENCES akai_boss_v8_realms(id),date text NOT NULL,account_id uuid NOT NULL REFERENCES akai_accounts(id),guild_id uuid REFERENCES akai_guild_v16_guilds(id),joined_at bigint,eligible boolean NOT NULL,baseline_damage numeric(38,0) NOT NULL CHECK(baseline_damage>=0),PRIMARY KEY(realm_id,date,account_id));
CREATE TABLE IF NOT EXISTS akai_boss_v18_archives(realm_id uuid NOT NULL REFERENCES akai_boss_v8_realms(id),date text NOT NULL,end_ms bigint NOT NULL,payload jsonb NOT NULL,PRIMARY KEY(realm_id,date));
CREATE INDEX IF NOT EXISTS akai_boss_v18_archive_end ON akai_boss_v18_archives(realm_id,end_ms);
DROP TRIGGER IF EXISTS akai_boss_v18_bindings_immutable ON akai_boss_v18_bindings;
CREATE TRIGGER akai_boss_v18_bindings_immutable BEFORE UPDATE OR DELETE ON akai_boss_v18_bindings FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_boss_v18_archives_immutable ON akai_boss_v18_archives;
CREATE TRIGGER akai_boss_v18_archives_immutable BEFORE UPDATE OR DELETE ON akai_boss_v18_archives FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
