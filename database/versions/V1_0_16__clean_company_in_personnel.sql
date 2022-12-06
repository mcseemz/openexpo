/* we clean up company data thus strictly detaching personnel for different entities */
UPDATE "personnel" SET company=null where company is not null and event is not null;
UPDATE "personnel" SET company=null where company is not null and stand is not null;
