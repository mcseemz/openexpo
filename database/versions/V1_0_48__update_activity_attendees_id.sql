DROP TABLE IF EXISTS activity_old;
SELECT * INTO activity_old FROM activity;

WITH event_table AS (
    SELECT
        aa.activity,
        aa.event,
        aa.stand,
        aa.attendee_user_id AS "person_id",
        aa.attendee_role,
        pp.id AS "personnel_id"
    FROM
        (
            SELECT
                id AS "activity",
                event,
                stand,
                attendees::jsonb->'id' AS "attendee_user_id",
                attendees::jsonb->'role' AS "attendee_role"
            FROM
                (
                    SELECT
                        id,
                        event,
                        stand,
                        jsonb_array_elements(value::jsonb#>'{attendees}') AS "attendees"
                    FROM
                        activity
                    where
                            value ?| array['attendees']) AS foo) AS aa
            INNER JOIN personnel pp ON
                    aa.attendee_user_id::int = pp.person
                AND aa.event = pp.event
    ORDER BY
        aa.activity),
     stand_table AS (
         SELECT
             aa.activity,
             aa.event,
             aa.stand,
             aa.attendee_user_id AS "person_id",
             aa.attendee_role,
             pp.id AS "personnel_id"
         FROM
             (
                 SELECT
                     id AS "activity",
                     event,
                     stand,
                     attendees::jsonb->'id' AS "attendee_user_id",
                     attendees::jsonb->'role' AS "attendee_role"
                 FROM
                     (
                         SELECT
                             id,
                             event,
                             stand,
                             jsonb_array_elements(value::jsonb#>'{attendees}') AS "attendees"
                         FROM
                             activity
                         WHERE
                                 value ?| array['attendees']) AS foo) AS aa
                 INNER JOIN personnel pp ON
                         aa.attendee_user_id::int = pp.person
                     AND aa.stand = pp.stand
         ORDER BY
             aa.activity)
SELECT a.id, a.value AS "old_val", JSONB_SET(a.value::jsonb,'{attendees}',res.new_val) AS "new_val" INTO activity_temp
FROM activity a JOIN (
    SELECT
        activity,
        TO_JSONB(ARRAY_AGG(CONCAT('{"id": "', personnel_id::text, '", "role": ', attendee_role::text, '}')::jsonb)) AS "new_val"
    FROM
        (
            SELECT
                activity,
                event,
                stand,
                person_id,
                attendee_role,
                min(personnel_id) AS "personnel_id"
            FROM
                (
                    SELECT
                        *
                    FROM
                        event_table
                    UNION ALL
                    SELECT
                        *
                    FROM
                        stand_table) AS unt
            GROUP BY
                activity,
                event,
                stand,
                person_id,
                attendee_role) AS grp
    GROUP BY
        activity) AS res ON a.id = res.activity;

UPDATE activity SET value = at.new_val FROM activity_temp at WHERE activity.id = at.id;
DROP TABLE IF EXISTS activity_temp;
-- removing the key from activities as not used
UPDATE activity SET value = value - 'presenter' WHERE value ? 'presenter';
