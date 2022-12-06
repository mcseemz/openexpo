ALTER TABLE meeting_attendies
ADD CONSTRAINT meeting_attendies_uq UNIQUE (meeting, person);
