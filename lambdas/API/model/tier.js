const exceptionUtil = require('./exception');
const stringUtil = require('./strings');

async function createTierInDb(client, tier) {
  const query = {
    text: 'INSERT into tier (is_enabled, default_id, logo, pricing, event, switches) VALUES ($1, $2, $3, $4, $5, $6) returning *',
    values: [tier['is_enabled'], Number(tier['default_id']), tier['logo'], tier['pricing'] ? Number(tier['pricing']) : null, tier['event'] ? Number(tier['event']) : null,
      tier['switches']]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("created:", res.rows);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

async function updateTierInDbOrThrowException(client, tier) {
  const query = {
    text: 'update tier set is_enabled = $1, logo = $2, pricing = $3, switches = $4 where id = $5 returning *',
    values: [tier['is_enabled'], tier['logo'], tier['pricing'], tier['switches'], tier['id']]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("updated:", res.rows);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Tier does not exist');
  }
}

async function updateTierPricing(client, tierId, pricingId) {
  const query = {
    text: 'update tier set pricing = $1 where id = $2 returning *',
    values: [Number(pricingId), Number(tierId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("updated:", res.rows);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Tier does not exist');
  }
}

async function customTierExists(client, baseId, eventId) {
  const query = {
    text: 'select * from tier where default_id = $1 and event = $2',
    values: [Number(baseId), Number(eventId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);

  return !!res.rows.length;
}

/**
 * get complete tier data, with pricing and strings
 * @param {Object} client
 * @param {number} eventId
 * @param {string?} language
 * @returns {Promise<*>}
 */
async function getTiersForEvent(client, eventId, language) {
  let query = {
    text: `select t.*, ep.access_currency, ep.access_price
           from tier t
                    left join event_pricing ep on ep.id = t.pricing
           where default_id is null`,
    values: []
  };

  console.log("REQUEST:", query);
  let baseTiers = await client.query(query);
  console.log("selected:", baseTiers.rows);

  query = {
    text: `select t.*, ep.access_currency, ep.access_price
           from tier t
                    left join event_pricing ep on ep.id = t.pricing
           where t.event = $1`,
    values: [Number(eventId)]
  };

  console.log("REQUEST:", query);
  let res = await client.query(query);
  console.log("selected:", res.rows);

  const tiers = baseTiers.rows.map(b => res.rows.find(t => t['default_id'] === b['id']) || b);

  const tierIds = tiers.map(t => t['default_id'] || t['id']);
  if (tierIds.length) {
    const additionalStrings = await stringUtil.getStringsForMultipleEntities(client, 'tier', tierIds, language);

    if (additionalStrings != null) {
      tiers.forEach((t) => {
        t['strings'] = additionalStrings.filter(s => s['ref_id'] === t['default_id'] || s['ref_id'] === t['id']);
        t['strings'].forEach(s => delete s['ref_id']);
      });
    }
  }

  return tiers;
}

/**
 * return basic data for enabled tiers per event
 * @param {Object} client
 * @param {number} eventId
 * @returns {Promise<*>}
 */
async function getTiersEnabledForEventSimple(client, eventId) {
  let query = {
    text: `select t.*
           from tier t
                    
           where t.event = $1 and is_enabled = true`,
    values: [Number(eventId)]
  };

  console.log("REQUEST:", query);
  let tiers = await client.query(query);
  console.log("selected:", tiers.rows.length);

  return tiers.rows;
}


async function getByIdOrThrowException(client, tierId, language) {
  const query = {
    text: `select t.*, ep.access_currency, ep.access_price
           from tier t
                    left join event_pricing ep on ep.id = t.pricing
           where t.id = $1`,
    values: [Number(tierId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);

  if (!res.rows.length) {
    throw new exceptionUtil.ApiException(405, 'Tier does not exist');
  } else {
    const tier = res.rows[0];

    const additionalStrings = await stringUtil.getStringsForMultipleEntities(client, 'tier', [tier['default_id'] || tier['id']], language);
    if (additionalStrings != null) {
      tier['strings'] = additionalStrings;
      tier['strings'].forEach(s => delete s['ref_id']);
    }

    return tier;
  }
}

async function tierHasActiveSponsors(client, tierId) {
  const query = {
    text: `select *
           from tier t
                    left join relation r on r.subject_ref = 'tier' and r.subject_ref_id = t.id
           where t.id = $1
             and r.id is not null`,
    values: [Number(tierId)]
  };

  console.log("REQUEST:", query);
  const res = await client.query(query);
  console.log("selected:", res.rows);

  return !!res.rows.length;
}

exports.createTierInDb = createTierInDb;
exports.getTiersForEvent = getTiersForEvent;
exports.getTiersEnabledForEventSimple = getTiersEnabledForEventSimple;
exports.customTierExists = customTierExists;
exports.getByIdOrThrowException = getByIdOrThrowException;
exports.tierHasActiveSponsors = tierHasActiveSponsors;
exports.updateTierInDbOrThrowException = updateTierInDbOrThrowException;
exports.updateTierPricing = updateTierPricing;
