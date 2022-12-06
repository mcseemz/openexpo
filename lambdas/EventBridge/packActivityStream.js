/**
 * @description Pack activity stream data.
 * We take raw activity data and pack it according to some rules
 * Packed data is fetched to UI to display, so it should contain as much as possible to avoid excessive requests.
 * Current rules are:
 * always single:
 *     news_add
 *     activity_add
 *     activity_start
 *     lottery_start
 *     survey_start
 * can be packed:
 *     stand_add
 *     stand_left
 *     pricing_change
 *     document_add
 */
const poolUtil = require('./model/pool');
const util = require('./model/util');
const streamUtil = require('./model/stream');
const streamPackUtil = require('./model/streamPacked');

/**
 * group activities by entity, e.g. specific event
 * @param {array} freshEntries - list of activities to pack
 * @returns {{}} grouped activities
 */
function repackEntries(freshEntries) {
  const newPack = {};
  for (let i in freshEntries) {
    const key = freshEntries[i]['object_ref'] + '.' + freshEntries[i]['object_ref_id'];
    if (!newPack[key]) {
      newPack[key] = {
        objkey: key,
        object_ref: freshEntries[i]['object_ref'],
        object_ref_id: freshEntries[i]['object_ref_id'],
        entries: [freshEntries[i]]
      }
    } else {
      newPack[key]['entries'].push(freshEntries[i]);
    }
  }
  return newPack;
}

async function updateSingularPack(client, action, subjectRef) {
  const freshEntries = await streamUtil.getFreshStreamEntries(client, action);
  if (!freshEntries.length) {
    return;
  }

  //group activities by event
  const newPack = repackEntries(freshEntries);
  //get today's latest packs per event for action
  const relatedPacks = await streamPackUtil.getPacksForStreamEntries(client, action);

  for (let key in newPack) {
    const group = newPack[key];
    const pack = relatedPacks.find(p => p['objkey'] === group['objkey']);
    //get new items tp add to pack
    const itemsToCreate = group['entries'].filter(e => !pack || e['created'] > pack['latest']);

    for (let i in itemsToCreate) {
      const item = itemsToCreate[i];
      await streamPackUtil.createNewPacksForStreamEntries(client, item['object_ref'], item['object_ref_id'], [item['subject_ref_id']], item['created'], action, subjectRef);
    }
  }
}

async function createNewPacks(itemsToCreate, ITEMS_IN_PACK, client, group, action, subjectRef) {
  while (itemsToCreate.length) {
    const items = itemsToCreate.splice(0, ITEMS_IN_PACK);
    let ids = items.map(i => i['subject_ref_id']);
    ids = [...new Set(ids)];
    const latest = Math.max(...items.map(i => i['created']), 0);
    await streamPackUtil.createNewPacksForStreamEntries(client, group['object_ref'], group['object_ref_id'], ids, new Date(latest), action, subjectRef);
  }
}

async function updateExistingPack(pack, itemsToCreate, client) {
  let newIds = pack['parameter'].concat(itemsToCreate.map(i => i['subject_ref_id']));
  newIds = [...new Set(newIds)];
  await streamPackUtil.updateExistingPackWithStreamEntries(client, pack['id'], newIds);
}

async function updatePack(client, action, subjectRef) {
  const ITEMS_IN_PACK = 100;
  const freshEntries = await streamUtil.getFreshStreamEntries(client, action);
  if (!freshEntries.length) {
    return;
  }

  const newPack = repackEntries(freshEntries);

  const relatedPacks = await streamPackUtil.getPacksForStreamEntries(client, action);

  for (let key in newPack) {
    const group = newPack[key];
    const pack = relatedPacks.find(p => p['objkey'] === group['objkey']);

    const itemsToCreate = group['entries'].filter(e => !pack || e['created'] > pack['latest']);

    if (!pack) {
      //create new pack or more
      await createNewPacks(itemsToCreate, ITEMS_IN_PACK, client, group, action, subjectRef);
    } else {
      //add to existing pack and maybe more
      if (pack['parameter'].length < ITEMS_IN_PACK) {
        //add to pack
        if (pack['parameter'].length + itemsToCreate.length <= ITEMS_IN_PACK) {
          //fits into pack
          await updateExistingPack(pack, itemsToCreate, client);
        } else {
          //need to split: to pack and new
          const itemsToInclude = itemsToCreate.splice(0, ITEMS_IN_PACK - pack['parameter'].length);
          await updateExistingPack(pack, itemsToInclude, client);
          await createNewPacks(itemsToCreate, ITEMS_IN_PACK, client, group, action, subjectRef);
        }
      } else {
        //new items
        await createNewPacks(itemsToCreate, ITEMS_IN_PACK, client, group, action, subjectRef);
      }
    }
  }
}

exports.handler = async function (data, context) {
  util.handleStart(data, 'lambdaPackActivityStream');

  let client = util.emptyClient;
  try {
    client = await poolUtil.initPoolClientByEnvironment(data['env'], context);

    //get stream data for today per entity
    await updateSingularPack(client, streamUtil.NEWS_ADD, 'news');
    await updateSingularPack(client, streamUtil.ACTIVITY_ADD, 'activity');
    await updateSingularPack(client, streamUtil.ACTIVITY_START, 'activity');
    await updateSingularPack(client, streamUtil.LOTTERY_START, 'relation');
    await updateSingularPack(client, streamUtil.SURVEY_START, 'relation');

    await updatePack(client, streamUtil.STAND_ADD, 'stand');
    await updatePack(client, streamUtil.STAND_LEFT, 'stand');
    await updatePack(client, streamUtil.PRICING_CHANGE, 'pricing');
    await updatePack(client, streamUtil.DOCUMENT_ADD, 'upload');

    //group by entity and type
    //get related pack (from today) or mark for new pack
    //add to pack (not more than 100) or create new pack ()

    return util.handle200(data);
  } catch (err) {
    return util.handleError(data, err);
  } finally {
    util.handleFinally(data, client);
  }
};
