/**
 *  @description CustomName module
 *  @class customNameUtil
 */
const util = require('./util');

/**
 * Checks if the given custom name is available for specified data type.
 * @param client - PG client
 * @param customName - string to check as a custom name for the activity
 * @param entityType - name of the table to request check
 * @returns true if available, false - if taken
 */
async function customNameIsAvailable(client, customName, entityType='', entityId=-1) {
  const llog = client.log || util.log;

  let result, query, innerQueryText='';
  query = {
    text: `SELECT t.table_name
            FROM information_schema.tables t
            INNER JOIN information_schema.columns c ON c.table_name = t.table_name 
                                            AND c.table_schema = t.table_schema
            WHERE c.column_name = 'custom_name'
                  AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
                  AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_schema;`,
    values: []
  };
  llog.debug("REQUEST customNameIsAvailable (getting tables list):", query);
  result = await client.query(query);
  llog.debug("fetched:", result.rows.length);

  result.rows.forEach(row => {
    innerQueryText += `${innerQueryText.trim().length === 0 ? '' : 'UNION'} SELECT custom_name, '${row.table_name}' as type, id FROM 
    (SELECT custom_name, id FROM ${row.table_name} WHERE custom_name ILIKE $1) ${row.table_name + "_filtered"} `;
  });

  query = {
    text: `SELECT custom_name, type, id FROM (${innerQueryText}) filtered  
            WHERE  custom_name ILIKE $1 
                AND 
                  CASE 
                    WHEN type = $2 THEN id != $3
                    ELSE true
                  END`,
    values: [customName, entityType, Number(entityId)]
  };

  llog.debug("REQUEST customNameIsAvailable (main query):", query);
  result = await client.query(query);
  llog.debug("fetched:", result.rows.length);

  return result.rows.length === 0;
}

/**
 * Creates a new random string that can be used as a name
 * @returns string 
 */
function getSubstituteName() {
  return `${util.uuid32()}-gen`;
}

exports.customNameIsAvailable = customNameIsAvailable;
exports.getSubstituteName = getSubstituteName;
