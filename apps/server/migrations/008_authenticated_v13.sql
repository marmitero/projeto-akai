-- One canonical event authority for an explicitly enabled isolated HTTP playtest.
-- No live-account migration marker, self-enrollment, extra rewards or new wealth source.
CREATE TABLE IF NOT EXISTS akai_v13_world (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 realm_id uuid NOT NULL UNIQUE REFERENCES akai_boss_v8_realms(id)
);
CREATE TABLE IF NOT EXISTS akai_v13_members (
 account_id uuid PRIMARY KEY REFERENCES akai_accounts(id),
 run_id uuid NOT NULL UNIQUE REFERENCES akai_economy_rehearsals(id),
 enabled boolean NOT NULL DEFAULT true
);
DROP TRIGGER IF EXISTS akai_v13_world_immutable ON akai_v13_world;
CREATE TRIGGER akai_v13_world_immutable BEFORE UPDATE OR DELETE ON akai_v13_world FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
CREATE OR REPLACE FUNCTION akai_v13_member_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.account_id IS DISTINCT FROM OLD.account_id OR NEW.run_id IS DISTINCT FROM OLD.run_id THEN
 RAISE EXCEPTION 'V13 binding is immutable'; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS akai_v13_member_immutable ON akai_v13_members;
CREATE TRIGGER akai_v13_member_immutable BEFORE UPDATE ON akai_v13_members FOR EACH ROW EXECUTE FUNCTION akai_v13_member_guard();
DROP TRIGGER IF EXISTS akai_v13_member_no_delete ON akai_v13_members;
CREATE TRIGGER akai_v13_member_no_delete BEFORE DELETE ON akai_v13_members FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
