-- Opt-in canonical rehearsal calendar. No retrospective rewards before tracking.
CREATE TABLE IF NOT EXISTS akai_season_v17_world(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),revision bigint NOT NULL DEFAULT 0,clock_ms bigint NOT NULL DEFAULT 0,period jsonb);
INSERT INTO akai_season_v17_world(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS akai_season_v17_archives(season_id text PRIMARY KEY,payload jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS akai_season_v17_rewards(season_id text NOT NULL REFERENCES akai_season_v17_archives(season_id),source text NOT NULL CHECK(source IN ('arena','guild')),account_id uuid NOT NULL REFERENCES akai_accounts(id),coin numeric(38,0) NOT NULL CHECK(coin>0),PRIMARY KEY(season_id,source,account_id));
CREATE TABLE IF NOT EXISTS akai_season_v17_commands(account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(account_id,command_id));
CREATE TABLE IF NOT EXISTS akai_season_v17_events(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload jsonb NOT NULL,UNIQUE(account_id,command_id));
DROP TRIGGER IF EXISTS akai_season_v17_archive_immutable ON akai_season_v17_archives;
CREATE TRIGGER akai_season_v17_archive_immutable BEFORE UPDATE OR DELETE ON akai_season_v17_archives FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_season_v17_rewards_immutable ON akai_season_v17_rewards;
CREATE TRIGGER akai_season_v17_rewards_immutable BEFORE UPDATE OR DELETE ON akai_season_v17_rewards FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_season_v17_commands_immutable ON akai_season_v17_commands;
CREATE TRIGGER akai_season_v17_commands_immutable BEFORE UPDATE OR DELETE ON akai_season_v17_commands FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_season_v17_events_immutable ON akai_season_v17_events;
CREATE TRIGGER akai_season_v17_events_immutable BEFORE UPDATE OR DELETE ON akai_season_v17_events FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
