INSERT INTO dictionary (category, value) VALUES ('imagesize','180x140')
ON CONFLICT ON CONSTRAINT dictionary_uq DO NOTHING;