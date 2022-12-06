const stringUtils = require('./strings');
const util = require('./util');

async function getRecordsFromDb(client, category, language, ignoreLanguage) {
  const llog = client.log || util.log;

  let query = {
    text: 'select d.value as id, d.id as tmp_id, s.value, s.language from Dictionary d left join Strings s on d.id = s.ref_id and s.ref = \'dictionary\' where d.category = $1 and ($2 or s.is_default = true)',
    values: [category, !!ignoreLanguage]
  };

  llog.debug("REQUEST:", query);
  let res = await client.query(query);
  llog.debug("fetched:", res.rows);

  if (!ignoreLanguage && res.rows.length) {
    const ids = res.rows.map(r => r['tmp_id']);
    query = {
      text: 'SELECT * from Strings where ref = \'dictionary\' and ref_id = ANY($1) and language = $2',
      values: [ids, language]
    };

    llog.debug("REQUEST:", query);
    const updateStrRes = await client.query(query);
    llog.debug("fetched:", updateStrRes.rows);

    if (updateStrRes.rows.length > 0) {
      for (const r of updateStrRes.rows) {
        const itemToUpdate = res.rows.find(i => i['tmp_id'] === r['ref_id']);
        itemToUpdate['value'] = r['value'];
        itemToUpdate['language'] = r['language'];
      }
    }
  }

  res.rows.forEach(r => delete r['tmp_id']);

  return res.rows;
}

async function dimensionExists(client, dimension) {
  const llog = client.log || util.log;

  const query = {
    text: 'select * from Dictionary where category = \'imagesize\' and value = $1',
    values: [dimension]
  };

  llog.debug("REQUEST:", query);

  const res = await client.query(query);
  llog.debug("fetched:", res.rows);

  return res.rows.length !== 0;
}

async function getFieldFormatDescription(client, fieldNames, language) {
  const llog = client.log || util.log;

  let query;
  if (fieldNames) {
    query = {
      text: `select d.id, d.category, d.value as fieldName, s.value
             from Dictionary d
                      left join strings s on s.ref = 'dictionary' and s.ref_id = d.id and s.is_default = true and s.category = 'description_long'
             where d.category = 'profilefield'
               and d.value = ANY ($1)`,
      values: [fieldNames]
    };
  } else {
    query = {
      text: `select d.id, d.category, d.value as fieldName, s.value
             from Dictionary d
                      left join strings s on s.ref = 'dictionary' and s.ref_id = d.id and s.is_default = true and s.category = 'description_long'
             where d.category = 'profilefield'`,
      values: []
    };
  }

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("fetched:", res.rows);

  res.rows.forEach(r => {
    r['value'] = JSON.parse(r['value']);
  });

  if (res.rows.length) {
    const catIds = res.rows.map(e => e['id']);
    const additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'dictionary', catIds, language);

    if (additionalStrings != null) {
      res.rows.forEach((f) => {
        const strings = additionalStrings.filter(str => str['ref_id'] === f['id']).find(s => s['category'] === 'name');
        f['name'] = strings ? strings['value'] : '';
        delete f['id'];
      });
    }
  }

  return res.rows;
}

async function getAllowedValuesForCategories(client, categories, language) {
  const llog = client.log || util.log;

  const query = {
    text: 'select id, category, value from Dictionary where category = ANY ($1)',
    values: [categories]
  };

  llog.debug("REQUEST:", query);
  const res = await client.query(query);
  llog.debug("fetched:", res.rows);

  if (res.rows.length) {
    const catIds = res.rows.map(e => e['id']);
    const additionalStrings = await stringUtils.getStringsForMultipleEntities(client, 'dictionary', catIds, language);

    if (additionalStrings != null) {
      let result = res.rows.map(f => {
        const strings = additionalStrings.filter(str => str['ref_id'] === f['id']).find(s => s['category'] === 'name');
        const name = strings ? strings['value'] : '';

        return {
          category: f['category'],
          value: f['value'],
          name: name
        };
      });

      llog.debug(result);
      return result;
    }
  }

  return res.rows;
}

exports.getRecordsFromDb = getRecordsFromDb;
exports.dimensionExists = dimensionExists;
exports.getAllowedValuesForCategories = getAllowedValuesForCategories;
exports.getFieldFormatDescription = getFieldFormatDescription;