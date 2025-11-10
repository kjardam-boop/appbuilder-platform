-- Rename app_types to system_types in external_systems table
ALTER TABLE external_systems 
RENAME COLUMN app_types TO system_types;