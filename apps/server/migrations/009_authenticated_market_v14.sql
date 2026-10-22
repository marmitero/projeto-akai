-- Pins the existing private market to the authenticated V13 world. No live wealth changes.
CREATE TABLE IF NOT EXISTS akai_v14_market (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 realm_id uuid NOT NULL UNIQUE REFERENCES akai_market_v2_realms(id)
);
DROP TRIGGER IF EXISTS akai_v14_market_immutable ON akai_v14_market;
CREATE TRIGGER akai_v14_market_immutable BEFORE UPDATE OR DELETE ON akai_v14_market FOR EACH STATEMENT EXECUTE FUNCTION akai_no_history_change();
