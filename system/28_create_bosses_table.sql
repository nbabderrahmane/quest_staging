-- Create bosses table
CREATE TABLE IF NOT EXISTS bosses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- NULL for system bosses
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    image_healthy TEXT NOT NULL, -- Path to image
    image_bloody TEXT NOT NULL,
    image_dead TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE bosses ENABLE ROW LEVEL SECURITY;

-- 1. System bosses are viewable by everyone
CREATE POLICY "System bosses are viewable by everyone"
    ON bosses FOR SELECT
    USING (is_system = true);

-- 2. Team bosses are viewable by team members
CREATE POLICY "Team bosses are viewable by team members"
    ON bosses FOR SELECT
    USING (
        team_id IS NOT NULL AND
        (EXISTS (SELECT 1 FROM team_members WHERE team_id = bosses.team_id AND user_id = auth.uid()))
    );

-- 3. Team admins and owners can manage team bosses
CREATE POLICY "Cmdrs can manage team bosses"
    ON bosses FOR ALL
    USING (
        team_id IS NOT NULL AND
        is_system = false AND
        (EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = bosses.team_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'manager')
        ))
    );

-- Trigger to limit custom bosses to 10 per team
CREATE OR REPLACE FUNCTION check_boss_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM bosses WHERE team_id = NEW.team_id) >= 10 THEN
        RAISE EXCEPTION 'MAX_BOSSES_REACHED: You cannot have more than 10 custom bosses.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_boss_limit_trigger ON bosses;
CREATE TRIGGER check_boss_limit_trigger
BEFORE INSERT ON bosses
FOR EACH ROW
WHEN (NEW.is_system = false)
EXECUTE FUNCTION check_boss_limit();

-- Insert the first system boss (Titan Kong) if it doesn't exist
INSERT INTO bosses (name, description, is_system, image_healthy, image_bloody, image_dead)
SELECT 'The Titan Kong', 'A colossal primitive beast.', true, '/bosses/kong-healthy.png', '/bosses/kong-bloody.png', '/bosses/kong-dead.png'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE name = 'The Titan Kong');
