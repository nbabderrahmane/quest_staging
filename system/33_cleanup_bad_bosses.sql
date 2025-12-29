-- 1. First, reassign any quests using these bosses to the default "Titan Kong"
-- This prevents the "violates foreign key constraint" error
UPDATE quests
SET boss_skin = (SELECT id FROM bosses WHERE name = 'The Titan Kong' LIMIT 1)
WHERE boss_skin IN (
    SELECT id FROM bosses 
    WHERE name IN ('Specimen 6: T-Rex', 'The Megalodon', 'Ninja Nemesis')
);

-- 2. Now it is safe to remove the rejected custom bosses
DELETE FROM bosses 
WHERE name IN ('Specimen 6: T-Rex', 'The Megalodon', 'Ninja Nemesis');
