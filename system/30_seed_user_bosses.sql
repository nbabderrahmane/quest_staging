-- Seed User Provided Bosses
-- Assets were uploaded and processed to /public/bosses/

-- 1. T-Rex (Specimen 6)
INSERT INTO bosses (name, description, is_system, image_healthy, image_bloody, image_dead)
SELECT 'Specimen 6: T-Rex', 'Genetically revived apex predator.', true, '/bosses/t-rex-healthy.png', '/bosses/t-rex-bloody.png', '/bosses/t-rex-dead.png'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE name = 'Specimen 6: T-Rex');

-- 2. The Megalodon
INSERT INTO bosses (name, description, is_system, image_healthy, image_bloody, image_dead)
SELECT 'The Megalodon', 'Terror of the deep.', true, '/bosses/megalodon-healthy.png', '/bosses/megalodon-bloody.png', '/bosses/megalodon-dead.png'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE name = 'The Megalodon');

-- 3. Ninja Nemesis
INSERT INTO bosses (name, description, is_system, image_healthy, image_bloody, image_dead)
SELECT 'Ninja Nemesis', 'Shadow warrior from the 80s.', true, '/bosses/ninja-healthy.png', '/bosses/ninja-healthy.png', '/bosses/ninja-dead.png' -- Missing Bloody, using Healthy
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE name = 'Ninja Nemesis');
