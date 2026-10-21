-- Isolated daily/weekly event authority; no legacy live-wealth route.
CREATE TABLE IF NOT EXISTS akai_boss_v8_realms(id uuid PRIMARY KEY,request_id uuid NOT NULL UNIQUE,roster_hash text NOT NULL,state jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS akai_boss_v8_members(realm_id uuid NOT NULL REFERENCES akai_boss_v8_realms(id),run_id uuid NOT NULL UNIQUE REFERENCES akai_economy_rehearsals(id),account_id uuid NOT NULL,PRIMARY KEY(realm_id,run_id),UNIQUE(realm_id,account_id));
CREATE TABLE IF NOT EXISTS akai_boss_v8_commands(run_id uuid NOT NULL,command_id uuid NOT NULL,realm_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(run_id,command_id));
CREATE TABLE IF NOT EXISTS akai_boss_v8_rewards(realm_id uuid NOT NULL,source text NOT NULL,account_id uuid NOT NULL,kind text NOT NULL,amount bigint NOT NULL CHECK(amount>0),at bigint NOT NULL,PRIMARY KEY(realm_id,source,account_id));
CREATE TABLE IF NOT EXISTS akai_boss_v8_broadcasts(realm_id uuid NOT NULL,source text NOT NULL,payload jsonb NOT NULL,PRIMARY KEY(realm_id,source));
CREATE TABLE IF NOT EXISTS akai_boss_v8_events(id uuid PRIMARY KEY,realm_id uuid NOT NULL,run_id uuid NOT NULL,command_id uuid NOT NULL,payload jsonb NOT NULL,UNIQUE(run_id,command_id));
DROP TRIGGER IF EXISTS akai_boss_v8_commands_immutable ON akai_boss_v8_commands;
CREATE TRIGGER akai_boss_v8_commands_immutable BEFORE UPDATE OR DELETE ON akai_boss_v8_commands FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_boss_v8_rewards_immutable ON akai_boss_v8_rewards;
CREATE TRIGGER akai_boss_v8_rewards_immutable BEFORE UPDATE OR DELETE ON akai_boss_v8_rewards FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_boss_v8_broadcasts_immutable ON akai_boss_v8_broadcasts;
CREATE TRIGGER akai_boss_v8_broadcasts_immutable BEFORE UPDATE OR DELETE ON akai_boss_v8_broadcasts FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_boss_v8_events_immutable ON akai_boss_v8_events;
CREATE TRIGGER akai_boss_v8_events_immutable BEFORE UPDATE OR DELETE ON akai_boss_v8_events FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
