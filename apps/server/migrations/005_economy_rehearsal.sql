-- Isolated rehearsal only. Never a live-account cutover marker or a second source of live wealth.
CREATE TABLE IF NOT EXISTS akai_economy_rehearsals (
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES akai_accounts(id),request_id uuid NOT NULL,
 source_hash text NOT NULL,archive jsonb NOT NULL,initial_state jsonb NOT NULL,state jsonb NOT NULL,
 secret text NOT NULL,revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),closed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(account_id,request_id)
);
CREATE TABLE IF NOT EXISTS akai_economy_rehearsal_commands (
 run_id uuid NOT NULL REFERENCES akai_economy_rehearsals(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,
 PRIMARY KEY(run_id,command_id)
);
CREATE TABLE IF NOT EXISTS akai_economy_rehearsal_ledger (
 run_id uuid NOT NULL REFERENCES akai_economy_rehearsals(id),sequence bigint NOT NULL,resource text NOT NULL,
 delta numeric(38,0) NOT NULL CHECK(delta<>0),balance numeric(38,0) NOT NULL CHECK(balance>=0),PRIMARY KEY(run_id,sequence,resource)
);
CREATE TABLE IF NOT EXISTS akai_economy_rehearsal_events (
 run_id uuid NOT NULL REFERENCES akai_economy_rehearsals(id),sequence bigint NOT NULL,event_id uuid NOT NULL UNIQUE,payload jsonb NOT NULL,
 PRIMARY KEY(run_id,sequence)
);
CREATE OR REPLACE FUNCTION akai_rehearsal_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.request_id IS DISTINCT FROM OLD.request_id OR NEW.archive IS DISTINCT FROM OLD.archive OR NEW.initial_state IS DISTINCT FROM OLD.initial_state OR NEW.source_hash IS DISTINCT FROM OLD.source_hash OR NEW.account_id IS DISTINCT FROM OLD.account_id OR NEW.secret IS DISTINCT FROM OLD.secret THEN
 RAISE EXCEPTION 'Rehearsal source archive is immutable'; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS akai_rehearsal_archive_immutable ON akai_economy_rehearsals;
CREATE TRIGGER akai_rehearsal_archive_immutable BEFORE UPDATE ON akai_economy_rehearsals FOR EACH ROW EXECUTE FUNCTION akai_rehearsal_archive_guard();
DROP TRIGGER IF EXISTS akai_rehearsal_ledger_immutable ON akai_economy_rehearsal_ledger;
CREATE TRIGGER akai_rehearsal_ledger_immutable BEFORE UPDATE OR DELETE ON akai_economy_rehearsal_ledger FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_rehearsal_events_immutable ON akai_economy_rehearsal_events;
CREATE TRIGGER akai_rehearsal_events_immutable BEFORE UPDATE OR DELETE ON akai_economy_rehearsal_events FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_rehearsal_commands_immutable ON akai_economy_rehearsal_commands;
CREATE TRIGGER akai_rehearsal_commands_immutable BEFORE UPDATE OR DELETE ON akai_economy_rehearsal_commands FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();

DROP TRIGGER IF EXISTS akai_rehearsal_no_delete ON akai_economy_rehearsals;
CREATE TRIGGER akai_rehearsal_no_delete BEFORE DELETE ON akai_economy_rehearsals FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
