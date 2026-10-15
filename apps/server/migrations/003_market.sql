CREATE TABLE IF NOT EXISTS akai_market_listings (
 id uuid PRIMARY KEY, seller uuid NOT NULL REFERENCES akai_accounts(id), asset jsonb NOT NULL,
 price numeric(30,0) NOT NULL CHECK(price>1), currency text NOT NULL CHECK(currency IN ('coin','iron','coal','gold','jade')),
 created_at bigint NOT NULL, expires_at bigint NOT NULL, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled','expired','removed')),
 claimed boolean NOT NULL DEFAULT false, closed_at bigint
);
CREATE INDEX IF NOT EXISTS akai_market_active ON akai_market_listings(created_at DESC,id) WHERE status='active';
CREATE INDEX IF NOT EXISTS akai_market_seller ON akai_market_listings(seller,created_at DESC);
CREATE TABLE IF NOT EXISTS akai_market_items (
 account_id uuid NOT NULL REFERENCES akai_accounts(id),item_id text NOT NULL,asset_key text NOT NULL,
 PRIMARY KEY(account_id,item_id)
);
CREATE TABLE IF NOT EXISTS akai_market_cooldowns (
 account_id uuid NOT NULL REFERENCES akai_accounts(id),asset_key text NOT NULL,until_at bigint NOT NULL,
 PRIMARY KEY(account_id,asset_key)
);
CREATE TABLE IF NOT EXISTS akai_market_offers (
 id uuid PRIMARY KEY,listing_id uuid NOT NULL REFERENCES akai_market_listings(id),buyer uuid NOT NULL REFERENCES akai_accounts(id),
 price numeric(30,0) NOT NULL CHECK(price>1),currency text NOT NULL CHECK(currency IN ('coin','iron','coal','gold','jade')),
 expires_at bigint NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','withdrawn','expired','closed')),
 created_at bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS akai_market_one_offer ON akai_market_offers(listing_id,buyer) WHERE status='pending';
CREATE TABLE IF NOT EXISTS akai_market_trades (
 id uuid PRIMARY KEY,listing_id uuid NOT NULL UNIQUE REFERENCES akai_market_listings(id),buyer uuid NOT NULL REFERENCES akai_accounts(id),seller uuid NOT NULL REFERENCES akai_accounts(id),
 price numeric(30,0) NOT NULL,fee numeric(30,0) NOT NULL,net numeric(30,0) NOT NULL,currency text NOT NULL,asset jsonb NOT NULL,at bigint NOT NULL,
 CHECK(price=fee+net AND fee>0 AND net>0)
);
CREATE TABLE IF NOT EXISTS akai_market_commands (
 account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,
 PRIMARY KEY(account_id,command_id)
);
CREATE TABLE IF NOT EXISTS akai_market_audit (
 id uuid PRIMARY KEY,actor text NOT NULL,action text NOT NULL,payload jsonb NOT NULL,at bigint NOT NULL
);
DROP TRIGGER IF EXISTS akai_market_audit_immutable ON akai_market_audit;
CREATE TRIGGER akai_market_audit_immutable BEFORE UPDATE OR DELETE ON akai_market_audit FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_market_trades_immutable ON akai_market_trades;
CREATE TRIGGER akai_market_trades_immutable BEFORE UPDATE OR DELETE ON akai_market_trades FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_market_commands_immutable ON akai_market_commands;
CREATE TRIGGER akai_market_commands_immutable BEFORE UPDATE OR DELETE ON akai_market_commands FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
