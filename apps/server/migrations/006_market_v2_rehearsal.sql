-- Private cohort market. No routes or writes to legacy live-account wealth.
CREATE TABLE IF NOT EXISTS akai_market_v2_realms (
 id uuid PRIMARY KEY,request_id uuid NOT NULL UNIQUE,roster_hash text NOT NULL,state jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS akai_market_v2_members (
 realm_id uuid NOT NULL REFERENCES akai_market_v2_realms(id),run_id uuid NOT NULL UNIQUE REFERENCES akai_economy_rehearsals(id),PRIMARY KEY(realm_id,run_id)
);
CREATE TABLE IF NOT EXISTS akai_market_v2_commands (
 realm_id uuid NOT NULL REFERENCES akai_market_v2_realms(id),run_id uuid NOT NULL REFERENCES akai_economy_rehearsals(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(run_id,command_id)
);
CREATE TABLE IF NOT EXISTS akai_market_v2_trades (
 id uuid PRIMARY KEY,realm_id uuid NOT NULL REFERENCES akai_market_v2_realms(id),listing_id uuid NOT NULL UNIQUE,buyer uuid NOT NULL,seller uuid NOT NULL,
 price numeric(38,0) NOT NULL,fee numeric(38,0) NOT NULL,net numeric(38,0) NOT NULL,asset jsonb NOT NULL,at bigint NOT NULL,
 CHECK(price=fee+net AND fee>0 AND net>0 AND buyer<>seller)
);
CREATE TABLE IF NOT EXISTS akai_market_v2_fees (
 realm_id uuid NOT NULL REFERENCES akai_market_v2_realms(id),event_key text NOT NULL,amount numeric(38,0) NOT NULL CHECK(amount>0),PRIMARY KEY(realm_id,event_key)
);
CREATE TABLE IF NOT EXISTS akai_market_v2_events (
 id uuid PRIMARY KEY,realm_id uuid NOT NULL REFERENCES akai_market_v2_realms(id),run_id uuid NOT NULL,command_id uuid NOT NULL,payload jsonb NOT NULL,
 UNIQUE(run_id,command_id)
);
DROP TRIGGER IF EXISTS akai_market_v2_commands_immutable ON akai_market_v2_commands;
CREATE TRIGGER akai_market_v2_commands_immutable BEFORE UPDATE OR DELETE ON akai_market_v2_commands FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_market_v2_trades_immutable ON akai_market_v2_trades;
CREATE TRIGGER akai_market_v2_trades_immutable BEFORE UPDATE OR DELETE ON akai_market_v2_trades FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_market_v2_fees_immutable ON akai_market_v2_fees;
CREATE TRIGGER akai_market_v2_fees_immutable BEFORE UPDATE OR DELETE ON akai_market_v2_fees FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_market_v2_events_immutable ON akai_market_v2_events;
CREATE TRIGGER akai_market_v2_events_immutable BEFORE UPDATE OR DELETE ON akai_market_v2_events FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
