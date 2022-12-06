ALTER TABLE dictionary
ADD CONSTRAINT dictionary_uq UNIQUE (category, value);

INSERT INTO dictionary (category, value) VALUES ('imagesize','40x40'), ('imagesize','212x180')
ON CONFLICT ON CONSTRAINT dictionary_uq DO NOTHING;