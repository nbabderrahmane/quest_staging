-- Seed new system bosses: Godzilla, Alien Predator, Matrix Sentinel

INSERT INTO bosses (name, description, is_system, image_healthy, image_bloody, image_dead)
SELECT 'Godzilla', 'King of the Monsters. A radioactive prehistoric beast.', true, '/bosses/godzilla-healthy.png', '/bosses/godzilla-bloody.png', '/bosses/godzilla-dead.png'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE name = 'Godzilla');

INSERT INTO bosses (name, description, is_system, image_healthy, image_bloody, image_dead)
SELECT 'Alien Predator', 'The ultimate hunter from the stars.', true, '/bosses/predator-healthy.png', '/bosses/predator-bloody.png', '/bosses/predator-dead.png'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE name = 'Alien Predator');

-- Note: Sentinel only has Healthy state due to generation limits. Using healthy image as fallback for now.
INSERT INTO bosses (name, description, is_system, image_healthy, image_bloody, image_dead)
SELECT 'Matrix Sentinel', 'A search-and-destroy machine.', true, '/bosses/sentinel-healthy.png', '/bosses/sentinel-healthy.png', '/bosses/sentinel-healthy.png'
WHERE NOT EXISTS (SELECT 1 FROM bosses WHERE name = 'Matrix Sentinel');
