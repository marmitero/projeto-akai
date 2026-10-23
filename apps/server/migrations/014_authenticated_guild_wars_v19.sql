CREATE TABLE IF NOT EXISTS akai_war_v19_world(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),revision bigint NOT NULL DEFAULT 0,clock_ms bigint NOT NULL DEFAULT 0,period jsonb);
INSERT INTO akai_war_v19_world(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS akai_war_v19_archives(season_id text PRIMARY KEY,payload jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS akai_war_v19_attacks(season_id text NOT NULL,account_id uuid NOT NULL REFERENCES akai_accounts(id),payload jsonb NOT NULL,PRIMARY KEY(season_id,account_id));
CREATE TABLE IF NOT EXISTS akai_war_v19_rewards(season_id text NOT NULL REFERENCES akai_war_v19_archives(season_id),account_id uuid NOT NULL REFERENCES akai_accounts(id),coin numeric(38,0) NOT NULL CHECK(coin>0),PRIMARY KEY(season_id,account_id));
CREATE TABLE IF NOT EXISTS akai_war_v19_commands(account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(account_id,command_id));
CREATE TABLE IF NOT EXISTS akai_war_v19_events(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload jsonb NOT NULL,UNIQUE(account_id,command_id));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['archives','attacks','rewards','commands','events'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS akai_war_v19_immutable ON akai_war_v19_%I',t);
 EXECUTE format('CREATE TRIGGER akai_war_v19_immutable BEFORE UPDATE OR DELETE ON akai_war_v19_%I FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change()',t);
 END LOOP;
END $$;
