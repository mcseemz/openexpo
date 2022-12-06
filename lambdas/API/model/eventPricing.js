/**
 *  @description Events module
 *  @class eventUtil
 */
const exceptionUtil = require('./exception');
const util = require('./util');

const EVENT_PRICING_FIELDS =
`ep.id,
ep.event,
ep.pricing_plan,
ep.access_price,
ep.access_currency,
ep.quantity,
ep.tags,
ep.version,
ep.status,
ep.parameter`;

/**
 * get all pricings for specified event. Sponsored and archived pricings not included
 * @param {Object} client database connection instance
 * @param {Number} eventId id of the event
 * @returns {Promise<Array>} Array of eventPricing objects
 */
async function getAllPricingForEvent(client, eventId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_PRICING_FIELDS}, (status='enabled'::event_pricing_status_type) AS "is_enabled"
           FROM event_pricing ep
           WHERE ep.event = $1
            AND ep.status <> 'archived'::event_pricing_status_type
            AND ep.pricing_plan NOT IN ('sponsorship_price')`,
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getAllPricingForEvent: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * get enabled pricings for specified event. Sponsored pricing not included
 * @param {Object} client database connection instance
 * @param {Number} eventId id of the event
 * @param {Boolean} withVersions if 'True' eventPricing object will be populated with version data.
 * @returns {Promise<Array>} Array of eventPricing objects
 */
async function getActivePricingForEvent(client, eventId, withVersions=false) {
  const llog = client.log || util.log;
  const fields = withVersions ? EVENT_PRICING_FIELDS : EVENT_PRICING_FIELDS.replace(/ep.version,/,"");
  const query = {
    text: `SELECT ${fields}, true AS "is_enabled"
           FROM event_pricing ep
           WHERE ep.event = $1
             AND ep.pricing_plan NOT IN ('sponsorship_price')
             AND ep.status = 'enabled'::event_pricing_status_type`,
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getActivePricingForEvent: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  return res.rows;
}

/**
 * get enabled pricings for specified tier or throws exeption if no pricing found
 * @param {Object} client database connection instance
 * @param {Number} tierId id of the tier
 * @returns {Promise<Array>} Array of eventPricing objects
 */
async function getActivePricingForTierOrThrowException(client, tierId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_PRICING_FIELDS}, true as "is_enabled"
           from event_pricing ep
                    left join tier t on ep.id = t.pricing
                    and ep.status = 'enabled'::event_pricing_status_type
           where t.id = $1`,
    values: [Number(tierId)]
  };

  llog.debug('REQUEST getActivePricingForTierOrThrowException: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Could not find pricing for the given tier');
  }
}

/**
 * get pricings by id or throws exeption if no pricing found
 * @param {Object} client database connection instance
 * @param {Number} pricingId id of the pricing
 * @returns {Promise<Object>} eventPricing object
 */
async function getPricingByIdOrThrowException(client, pricingId) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ${EVENT_PRICING_FIELDS}, (ep.status='enabled'::event_pricing_status_type) as "is_enabled" from event_pricing ep where ep.id = $1`,
    values: [Number(pricingId)]
  };

  llog.debug('REQUEST getPricingByIdOrThrowException: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    throw new exceptionUtil.ApiException(404, 'Event pricing not found');
  }
}

/**
 * get pricings by id or throws exeption if no pricing found
 * @param {Object} client database connection instance
 * @param {Object} pricing id of the pricing
 * @returns {Promise<Object>} eventPricing object
 */
async function createPricingInDb(client, pricing) {
  const llog = client.log || util.log;

  const query = {
    text: `INSERT into event_pricing (event, pricing_plan, access_price, access_currency, quantity, status, tags, version, parameter) 
        VALUES ($1, $2, $3, $4, $5, $6::event_pricing_status_type, $7, $8, $9::jsonb) returning *`,
    values: [Number(pricing['event']),
      pricing['pricing_plan'],
      Number(pricing['access_price']),
      pricing['access_currency'],
      Number(pricing['quantity']),
      pricing['is_enabled'] ? 'enabled':'disabled',
      pricing['tags'] ? JSON.stringify(pricing['tags']) : '[]',
      pricing['version'] ? JSON.stringify(pricing['version']) : '[]',
      pricing['parameter'],
    ]
  };

  llog.info('REQUEST createPricingInDb: ', query);
  const res = await client.query(query);
  llog.info('created: ', res.rows[0]);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * find pricing and mark as deprecated
 * @param {Object} client database connection instance
 * @param {Number} pricing id of the pricing, mandatory for regular pricing
 * @param {Number} tierId id of the tier, mandatory for sponsorship pricing 
 */
async function deprecatePreviousPricings(client, pricing, tierId) {
  const llog = client.log || util.log;

  if (pricing['pricing_plan'].includes('sponsorship')) {
    let query = {
      text: `SELECT ep.id
             from event_pricing ep
                      left join tier t on ep.id = t.pricing
             where t.id = $1`,
      values: [Number(tierId)]
    };

    llog.debug('REQUEST deprecatePreviousPricings: ', query);
    let res = await client.query(query);
    llog.info(`fetched: ${res.rows.length}`);

    if (res.rows.length) {
      query = {
        text: `UPDATE event_pricing
               set status = 'archived'::event_pricing_status_type
               where id = $1
               returning *`,
        values: [Number(res.rows[0]['id'])]
      };

      llog.debug('REQUEST deprecatePreviousPricings-2: ', query);
      res = await client.query(query);
      llog.info(`updated: ${res.rows.length}`);
    }
  } else {
    const query = {
      text: `UPDATE event_pricing
             set status = 'archived'::event_pricing_status_type
             where id = $1
               and pricing_plan::text not like '%sponsorship%'
             returning *`,
      values: [Number(pricing['id'])]
    };

    llog.debug('REQUEST deprecatePreviousPricings-3: ', query);
    const res = await client.query(query);
    llog.info(`updated: ${res.rows.length}`);
  }
}
/**
 * update pricing by id
 * @param {Object} client database connection instance
 * @param {Object} pricing id of the pricing
 * @returns {Promise<Object>} updated eventPricing object
 */
async function updatePricingInDb(client, pricing) {
  const llog = client.log || util.log;

  const query = {
    text: `UPDATE event_pricing SET 
                         pricing_plan = $1, 
                         access_price = $2, 
                         access_currency = $3, 
                         quantity = $4, 
                         status = $5::event_pricing_status_type, 
                         tags = $6, 
                         version=$7,
                         parameter=$8
        WHERE id = $9 RETURNING *`,
    values: [pricing['pricing_plan'],
      Number(pricing['access_price']),
      pricing['access_currency'],
      Number(pricing['quantity']),
      pricing['is_enabled'] ? 'enabled':'disabled',
      JSON.stringify(pricing['tags']) || '[]',
      JSON.stringify(pricing['version']) || '[]',
      pricing['parameter'],
      Number(pricing['id'])]
  };

  llog.info('REQUEST updatePricingInDb: ', query);
  const res = await client.query(query);
  llog.info(`updated: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * remove pricing by id
 * @param {Object} client database connection instance 
 * @param {Number} pricingId id of the pricing 
 * @returns {Promise<Object>} deleted eventPricing object 
 */
async function deletePricingInDb(client, pricingId) {
  const llog = client.log || util.log;
  const query = {
    text: 'DELETE FROM event_pricing WHERE id = $1 RETURNING *',
    values: [Number(pricingId)]
  };

  llog.debug('REQUEST deletePricingInDb: ', query);
  const res = await client.query(query);
  llog.info('deleted: ', res.rows[0]);

  if (res.rows.length > 0) {
    return res.rows[0];
  } else {
    return null;
  }
}

/**
 * get total number of tickets grouped by pricing plan for specified event
 * @param {Object} client database connection instance 
 * @param {Number} eventId id of the event 
 * @returns {Promise<Object>} Array
 */
async function getTicketNumPerPricing(client, eventId) {
  const llog = client.log || util.log;
  const query = {
    text: 'SELECT sum(quantity) as "numberOfTickets", pricing_plan from event_pricing where event = $1 group by pricing_plan',
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getTicketNumPerPricing: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

/**
 * get total number of tickets for specified pricing
 * @param {Object} client database connection instance 
 * @param {Number} pricingId id of the pricing 
 * @returns {Promise<Object>} Array
 */
async function getTicketNumForPricingById(client, pricingId) {
  const llog = client.log || util.log;
  const query = {
    text: 'SELECT COUNT(*) as "numberOfTickets" from ticket where pricing = $1',
    values: [Number(pricingId)]
  };

  llog.debug('REQUEST getTicketNumForPricingById: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows[0].numberOfTickets;
  } else {
    return 0;
  }
}

/**
 * get sum(price * quantity) of sold tickets for specified event grouped by pricing plan
 * @param {Object} client database connection instance 
 * @param {Number} eventId id of the event 
 * @returns {Promise<Object>} Array of objects
 */
async function getMoneyPerPricing(client, eventId) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT sum(access_price * quantity) as "money", pricing_plan from event_pricing where event = $1 group by pricing_plan',
    values: [Number(eventId)]
  };

  llog.debug('REQUEST getMoneyPerPricing: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

/**
 * get price and currency for array of pricing ids
 * @param {Object} client database connection instance 
 * @param {Number} ids array of pricing ids
 * @returns {Promise<Object>} Array of objects {id (Number), access_price (Number), access_currency(String)}
 */
async function getPricingForActivityStream(client, ids) {
  const llog = client.log || util.log;

  const query = {
    text: 'SELECT id, access_price, access_currency from event_pricing where id = ANY ($1)',
    values: [ids]
  };

  llog.debug('REQUEST getPricingForActivityStream: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

/**
 * for each id from ids array find pricing check is it could be deleted from table, 
 * i.e. there are no ticket with this pricing sold and event in 'draft' status 
 * @param {Object} client database connection instance 
 * @param {[Number]} ids array of pricing ids
 * @returns {Promise<Object>} Array of objects {id (int), is_removable (boolean)}
 */
async function fetchPricingIsRemovable(client, ids) {
  const llog = client.log || util.log;

  const query = {
    text: `SELECT ep.id, (COALESCE(COUNT(t.*), 0) = 0 AND e.status <> 'active' AND ep.status<>'archived'::event_pricing_status_type) AS "is_removable"  FROM event_pricing ep 
            LEFT JOIN event e ON ep.event = e.id
            LEFT JOIN ticket t ON ep.id = t.pricing AND ep.event = t.event
            WHERE ep.id = ANY($1::int[])		
            GROUP BY ep.id, e.status`,
    values: [ids]
  }

  llog.debug('REQUEST fetchPricingIsRemovable: ', query);
  const res = await client.query(query);
  llog.info(`fetched: ${res.rows.length}`);

  if (res.rows.length > 0) {
    return res.rows;
  } else {
    return [];
  }
}

/**
 * postprocess pricing for a frontend. We protecting some fields
 * @param {Object} pricing object from DB
 */
function preparePricingForOutput(pricing) {
  pricing['strings'] = [];
  pricing['expiration'] = pricing.parameter['expiration'];
  pricing['manualApproval'] = pricing.parameter['manual_approval'];
  delete pricing.parameter;
}

exports.getAllPricingForEvent = getAllPricingForEvent;
exports.getActivePricingForEvent = getActivePricingForEvent;
exports.createPricingInDb = createPricingInDb;
exports.updatePricingInDb = updatePricingInDb;
exports.deletePricingInDb = deletePricingInDb;
exports.getTicketNumPerPricing = getTicketNumPerPricing;
exports.getTicketNumForPricingById = getTicketNumForPricingById;
exports.getMoneyPerPricing = getMoneyPerPricing;
exports.getPricingByIdOrThrowException = getPricingByIdOrThrowException;
exports.getPricingForActivityStream = getPricingForActivityStream;
exports.deprecatePreviousPricings = deprecatePreviousPricings;
exports.getActivePricingForTierOrThrowException = getActivePricingForTierOrThrowException;
exports.fetchPricingIsRemovable = fetchPricingIsRemovable;
exports.preparePricingForOutput = preparePricingForOutput;
