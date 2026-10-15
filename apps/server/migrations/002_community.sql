CREATE TABLE IF NOT EXISTS akai_profiles (
 account_id uuid PRIMARY KEY REFERENCES akai_accounts(id), name text NOT NULL,
 muted_until bigint NOT NULL DEFAULT 0, suspended boolean NOT NULL DEFAULT false,
 last_chat bigint NOT NULL DEFAULT 0, arena_next bigint NOT NULL DEFAULT 0, joined_at bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS akai_profile_name ON akai_profiles(lower(name));
CREATE TABLE IF NOT EXISTS akai_guilds (
 id uuid PRIMARY KEY,name text NOT NULL,leader uuid NOT NULL REFERENCES akai_accounts(id),
 level integer NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 10),xp bigint NOT NULL DEFAULT 0,
 emblem jsonb NOT NULL,bonus_bp integer NOT NULL DEFAULT 0,bonus_until bigint NOT NULL DEFAULT 0,active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS akai_guild_name ON akai_guilds(lower(name)) WHERE active;
CREATE TABLE IF NOT EXISTS akai_members (
 account_id uuid PRIMARY KEY REFERENCES akai_accounts(id),guild_id uuid NOT NULL REFERENCES akai_guilds(id),
 role text NOT NULL CHECK(role IN ('leader','officer','member')),joined_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS akai_member_guild ON akai_members(guild_id);
CREATE TABLE IF NOT EXISTS akai_invites (
 guild_id uuid NOT NULL REFERENCES akai_guilds(id),account_id uuid NOT NULL REFERENCES akai_accounts(id),
 expires_at bigint NOT NULL,PRIMARY KEY(guild_id,account_id)
);
CREATE TABLE IF NOT EXISTS akai_chat (
 id bigserial PRIMARY KEY,author uuid NOT NULL REFERENCES akai_accounts(id),guild_id uuid REFERENCES akai_guilds(id),
 text text NOT NULL CHECK(length(text) BETWEEN 1 AND 500),at bigint NOT NULL,removed boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS akai_chat_scope ON akai_chat(guild_id,id DESC);
CREATE TABLE IF NOT EXISTS akai_blocks (owner uuid NOT NULL REFERENCES akai_accounts(id),target uuid NOT NULL REFERENCES akai_accounts(id),PRIMARY KEY(owner,target));
CREATE TABLE IF NOT EXISTS akai_reports (id uuid PRIMARY KEY,reporter uuid NOT NULL REFERENCES akai_accounts(id),message_id bigint NOT NULL REFERENCES akai_chat(id),reason text NOT NULL,at bigint NOT NULL,resolved boolean NOT NULL DEFAULT false,UNIQUE(reporter,message_id));
CREATE TABLE IF NOT EXISTS akai_seasons (id text PRIMARY KEY,start_at bigint NOT NULL,end_at bigint NOT NULL,closed boolean NOT NULL DEFAULT false,archive jsonb);
CREATE TABLE IF NOT EXISTS akai_arena (
 season_id text NOT NULL REFERENCES akai_seasons(id),account_id uuid NOT NULL REFERENCES akai_accounts(id),
 position integer NOT NULL CHECK(position>0),trophies integer NOT NULL DEFAULT 0 CHECK(trophies>=0),
 PRIMARY KEY(season_id,account_id),UNIQUE(season_id,position) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE IF NOT EXISTS akai_matches (id uuid PRIMARY KEY,season_id text NOT NULL REFERENCES akai_seasons(id),attacker uuid NOT NULL REFERENCES akai_accounts(id),defender uuid NOT NULL REFERENCES akai_accounts(id),won boolean NOT NULL,at bigint NOT NULL,result jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS akai_matches_attacker ON akai_matches(attacker,at DESC);
CREATE TABLE IF NOT EXISTS akai_guild_scores (season_id text NOT NULL REFERENCES akai_seasons(id),guild_id uuid NOT NULL REFERENCES akai_guilds(id),score bigint NOT NULL DEFAULT 0,PRIMARY KEY(season_id,guild_id));
CREATE TABLE IF NOT EXISTS akai_bosses (id text PRIMARY KEY,start_at bigint NOT NULL,end_at bigint NOT NULL,hp bigint NOT NULL,max_hp bigint NOT NULL,status text NOT NULL,last_hit uuid REFERENCES akai_accounts(id));
CREATE TABLE IF NOT EXISTS akai_boss_members (edition text NOT NULL REFERENCES akai_bosses(id),account_id uuid NOT NULL REFERENCES akai_accounts(id),next_at bigint NOT NULL,present_until bigint NOT NULL,engaged boolean NOT NULL DEFAULT true,damage bigint NOT NULL DEFAULT 0,PRIMARY KEY(edition,account_id));
CREATE TABLE IF NOT EXISTS akai_xp_windows (id text PRIMARY KEY,start_at bigint NOT NULL,end_at bigint NOT NULL,bp integer NOT NULL CHECK(bp BETWEEN 0 AND 10000));
CREATE TABLE IF NOT EXISTS akai_presence (id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES akai_accounts(id),start_at bigint NOT NULL,end_at bigint NOT NULL,eligible boolean NOT NULL);
CREATE INDEX IF NOT EXISTS akai_presence_draw ON akai_presence(start_at,end_at) WHERE eligible;
CREATE INDEX IF NOT EXISTS akai_presence_account ON akai_presence(account_id,end_at DESC);
CREATE TABLE IF NOT EXISTS akai_lotteries (id text PRIMARY KEY,at bigint NOT NULL,closed boolean NOT NULL DEFAULT false,winner uuid REFERENCES akai_accounts(id),eligible jsonb NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS akai_raids (edition text NOT NULL,account_id uuid NOT NULL REFERENCES akai_accounts(id),start_at bigint NOT NULL,end_at bigint NOT NULL,next_at bigint NOT NULL,present_until bigint NOT NULL,state jsonb NOT NULL,status text NOT NULL,PRIMARY KEY(edition,account_id));
CREATE TABLE IF NOT EXISTS akai_social_rewards (source text NOT NULL,account_id uuid NOT NULL REFERENCES akai_accounts(id),description text NOT NULL,at bigint NOT NULL,PRIMARY KEY(source,account_id));
CREATE TABLE IF NOT EXISTS akai_social_commands (account_id uuid NOT NULL REFERENCES akai_accounts(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(account_id,command_id));
CREATE TABLE IF NOT EXISTS akai_social_audit (id uuid PRIMARY KEY,actor text NOT NULL,action text NOT NULL,payload jsonb NOT NULL,at bigint NOT NULL);
CREATE TABLE IF NOT EXISTS akai_war_enrollments (season_id text NOT NULL REFERENCES akai_seasons(id),guild_id uuid NOT NULL REFERENCES akai_guilds(id),roster jsonb NOT NULL DEFAULT '[]',PRIMARY KEY(season_id,guild_id));
CREATE TABLE IF NOT EXISTS akai_wars (id uuid PRIMARY KEY,season_id text NOT NULL REFERENCES akai_seasons(id),guild_a uuid NOT NULL REFERENCES akai_guilds(id),guild_b uuid NOT NULL REFERENCES akai_guilds(id),start_at bigint NOT NULL,end_at bigint NOT NULL,status text NOT NULL,roster_a jsonb NOT NULL,roster_b jsonb NOT NULL,score_a integer NOT NULL DEFAULT 0,score_b integer NOT NULL DEFAULT 0,damage_a integer NOT NULL DEFAULT 0,damage_b integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS akai_war_attacks (war_id uuid NOT NULL REFERENCES akai_wars(id),account_id uuid NOT NULL REFERENCES akai_accounts(id),side text NOT NULL,won boolean NOT NULL,damage integer NOT NULL,PRIMARY KEY(war_id,account_id));
DROP TRIGGER IF EXISTS akai_social_audit_immutable ON akai_social_audit;
CREATE TRIGGER akai_social_audit_immutable BEFORE UPDATE OR DELETE ON akai_social_audit FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
DROP TRIGGER IF EXISTS akai_social_rewards_immutable ON akai_social_rewards;
CREATE TRIGGER akai_social_rewards_immutable BEFORE UPDATE OR DELETE ON akai_social_rewards FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();

-- Idempotent additions support development databases created during F6 validation.
ALTER TABLE akai_guilds ADD COLUMN IF NOT EXISTS bonus_until bigint NOT NULL DEFAULT 0;
ALTER TABLE akai_boss_members ADD COLUMN IF NOT EXISTS engaged boolean NOT NULL DEFAULT true;
