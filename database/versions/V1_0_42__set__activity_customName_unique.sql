UPDATE activity SET custom_name = null WHERE custom_name = '';

ALTER TABLE activity ADD CONSTRAINT activity_custom_name_uq UNIQUE (custom_name);