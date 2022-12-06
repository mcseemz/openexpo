INSERT INTO dictionary (category, value) VALUES ('imagesize','538x315')
ON CONFLICT ON CONSTRAINT dictionary_uq DO NOTHING;