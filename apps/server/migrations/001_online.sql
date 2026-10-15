CREATE TABLE IF NOT EXISTS akai_accounts (
 id uuid PRIMARY KEY, recovery_hash text UNIQUE NOT NULL, google_sub text UNIQUE,
 snapshot jsonb NOT NULL, state_version bigint NOT NULL DEFAULT 0 CHECK(state_version>=0),
 command_version bigint NOT NULL DEFAULT 0 CHECK(command_version>=0),
 last_at bigint NOT NULL CHECK(last_at>=0), presence_until bigint NOT NULL DEFAULT 0,
 click_tokens double precision NOT NULL DEFAULT 10 CHECK(click_tokens>=0 AND click_tokens<=10),
 click_at bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS akai_sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES akai_accounts(id),
 expires_at bigint NOT NULL, revoked boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS akai_sessions_account ON akai_sessions(account_id);
CREATE TABLE IF NOT EXISTS akai_commands (
 account_id uuid NOT NULL REFERENCES akai_accounts(id), command_id uuid NOT NULL,
 payload_hash text NOT NULL, result jsonb NOT NULL, PRIMARY KEY(account_id,command_id)
);
CREATE TABLE IF NOT EXISTS akai_ledger (
 account_id uuid NOT NULL REFERENCES akai_accounts(id), sequence bigint NOT NULL,
 resource text NOT NULL CHECK(resource IN ('coin','iron','coal','gold','jade','ruby','castIron')),
 delta numeric(38,0) NOT NULL CHECK(delta<>0), balance numeric(38,0) NOT NULL CHECK(balance>=0),
 reason text NOT NULL, PRIMARY KEY(account_id,sequence,resource), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS akai_events (
 account_id uuid NOT NULL REFERENCES akai_accounts(id), sequence bigint NOT NULL,
 event_id uuid NOT NULL UNIQUE, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,sequence)
);
CREATE TABLE IF NOT EXISTS akai_auth_limits (
 key text PRIMARY KEY, window_at bigint NOT NULL, count integer NOT NULL CHECK(count>0)
);
CREATE TABLE IF NOT EXISTS akai_nonces (
 hash text PRIMARY KEY, account_id uuid REFERENCES akai_accounts(id), expires_at bigint NOT NULL
);
-- Runtime role may insert ledger/events but must never edit economic history.
-- Use a dedicated migration owner. Runtime grants are documented in ONLINE.md.
CREATE OR REPLACE FUNCTION akai_no_history_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Economic history is append only'; END $$;
DROP TRIGGER IF EXISTS akai_ledger_immutable ON akai_ledger;
CREATE TRIGGER akai_ledger_immutable BEFORE UPDATE OR DELETE ON akai_ledger FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_events_immutable ON akai_events;
CREATE TRIGGER akai_events_immutable BEFORE UPDATE OR DELETE ON akai_events FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
CREATE TABLE IF NOT EXISTS akai_streams (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES akai_accounts(id), expires_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS akai_streams_account ON akai_streams(account_id);
