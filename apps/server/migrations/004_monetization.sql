CREATE TABLE IF NOT EXISTS akai_monetization_environment(id boolean PRIMARY KEY DEFAULT true CHECK(id),mode text NOT NULL CHECK(mode IN ('sandbox','google-play-test')));
CREATE TABLE IF NOT EXISTS akai_premium_intents(
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES akai_accounts(id),kind text NOT NULL CHECK(kind IN ('purchase','ad')),product_id text NOT NULL,
 state text NOT NULL DEFAULT 'created',created_at bigint NOT NULL,expires_at bigint NOT NULL,reward_value numeric(38,0) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS akai_premium_intents_account ON akai_premium_intents(account_id,created_at DESC);
CREATE TABLE IF NOT EXISTS akai_sandbox_receipts(
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES akai_accounts(id),intent_id uuid NOT NULL UNIQUE REFERENCES akai_premium_intents(id),product_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('PENDING','PURCHASED','CANCELLED')),kind text NOT NULL CHECK(kind IN ('purchase','ad')),token_cipher text NOT NULL,at bigint NOT NULL,finalized boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS akai_purchases(
 id uuid PRIMARY KEY,intent_id uuid REFERENCES akai_premium_intents(id),account_id uuid NOT NULL REFERENCES akai_accounts(id),provider text NOT NULL,token_hash text NOT NULL UNIQUE,token_cipher text NOT NULL,
 product_id text NOT NULL,kind text NOT NULL,state text NOT NULL CHECK(state IN ('pending','granted','revoked','cancelled')),delivery text NOT NULL DEFAULT 'pending',
 amount numeric(38,0) NOT NULL DEFAULT 0,created_at bigint NOT NULL,verified_at bigint NOT NULL,
 attempts integer NOT NULL DEFAULT 0,next_retry_at bigint NOT NULL DEFAULT 0,
 UNIQUE(provider,token_hash)
);
CREATE TABLE IF NOT EXISTS akai_premium_grants(
 source text NOT NULL,account_id uuid NOT NULL REFERENCES akai_accounts(id),kind text NOT NULL,amount numeric(38,0) NOT NULL,at bigint NOT NULL,
 PRIMARY KEY(source,kind)
);
CREATE TABLE IF NOT EXISTS akai_entitlements(account_id uuid NOT NULL REFERENCES akai_accounts(id),product_id text NOT NULL,source uuid NOT NULL REFERENCES akai_purchases(id),active boolean NOT NULL,PRIMARY KEY(account_id,product_id,source));
CREATE TABLE IF NOT EXISTS akai_premium_debts(account_id uuid PRIMARY KEY REFERENCES akai_accounts(id),ruby numeric(38,0) NOT NULL DEFAULT 0 CHECK(ruby>=0));
CREATE TABLE IF NOT EXISTS akai_ad_benefits(source uuid PRIMARY KEY REFERENCES akai_purchases(id),account_id uuid NOT NULL REFERENCES akai_accounts(id),kind text NOT NULL,start_at bigint NOT NULL,end_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS akai_ad_benefits_account ON akai_ad_benefits(account_id,start_at,end_at);
CREATE TABLE IF NOT EXISTS akai_premium_commands(account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(account_id,command_id));
CREATE TABLE IF NOT EXISTS akai_premium_audit(id uuid PRIMARY KEY,actor text NOT NULL,action text NOT NULL,payload jsonb NOT NULL,at bigint NOT NULL);
DROP TRIGGER IF EXISTS akai_premium_grants_immutable ON akai_premium_grants;
CREATE TRIGGER akai_premium_grants_immutable BEFORE UPDATE OR DELETE ON akai_premium_grants FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_premium_audit_immutable ON akai_premium_audit;
CREATE TRIGGER akai_premium_audit_immutable BEFORE UPDATE OR DELETE ON akai_premium_audit FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_premium_commands_immutable ON akai_premium_commands;
CREATE TRIGGER akai_premium_commands_immutable BEFORE UPDATE OR DELETE ON akai_premium_commands FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();

ALTER TABLE akai_purchases ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE akai_purchases ADD COLUMN IF NOT EXISTS next_retry_at bigint NOT NULL DEFAULT 0;
