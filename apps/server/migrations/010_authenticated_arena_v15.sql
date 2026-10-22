-- Isolated V13 arena. No economic grants, legacy ranks or guild/season payouts.
CREATE TABLE IF NOT EXISTS akai_arena_v15_world (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),clock_ms bigint NOT NULL DEFAULT 0 CHECK(clock_ms>=0)
);
INSERT INTO akai_arena_v15_world(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS akai_arena_v15_entries (
 season_id text NOT NULL,account_id uuid NOT NULL REFERENCES akai_accounts(id),position integer NOT NULL CHECK(position>0),trophies integer NOT NULL DEFAULT 0 CHECK(trophies>=0),
 PRIMARY KEY(season_id,account_id),UNIQUE(season_id,position) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS akai_arena_v15_players (
 account_id uuid PRIMARY KEY REFERENCES akai_accounts(id),next_at bigint NOT NULL DEFAULT 0 CHECK(next_at>=0)
);
CREATE TABLE IF NOT EXISTS akai_arena_v15_matches (
 id uuid PRIMARY KEY,season_id text NOT NULL,attacker uuid NOT NULL REFERENCES akai_accounts(id),defender uuid NOT NULL REFERENCES akai_accounts(id),at bigint NOT NULL,won boolean NOT NULL,audit jsonb NOT NULL,
 CHECK(attacker<>defender)
);
CREATE INDEX IF NOT EXISTS akai_arena_v15_daily ON akai_arena_v15_matches(attacker,at);
CREATE TABLE IF NOT EXISTS akai_arena_v15_commands (
 account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(account_id,command_id)
);
CREATE TABLE IF NOT EXISTS akai_arena_v15_events (
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload jsonb NOT NULL,UNIQUE(account_id,command_id)
);
DROP TRIGGER IF EXISTS akai_arena_v15_matches_immutable ON akai_arena_v15_matches;
CREATE TRIGGER akai_arena_v15_matches_immutable BEFORE UPDATE OR DELETE ON akai_arena_v15_matches FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_arena_v15_commands_immutable ON akai_arena_v15_commands;
CREATE TRIGGER akai_arena_v15_commands_immutable BEFORE UPDATE OR DELETE ON akai_arena_v15_commands FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_arena_v15_events_immutable ON akai_arena_v15_events;
CREATE TRIGGER akai_arena_v15_events_immutable BEFORE UPDATE OR DELETE ON akai_arena_v15_events FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
