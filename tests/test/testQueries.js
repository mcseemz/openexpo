const util = require('../../lambdas/API/model/util');

function createCompany(name, email) {
    return {
        text: `INSERT INTO company (name,email,website,vat,address,tags)
	VALUES ('Another good name from personnel','another@mail.com','www.google.com','1234567','{"use_as_billing":false}'::jsonb,'["",""]'::jsonb) RETURNING *;`}
}

function createEvent(customName, companyId, duration) {
    return {
        text: `INSERT INTO event(date_start,date_end,custom_name,timezone,company,contacts,status,tags)
	VALUES ($3,$4,$1,1,$2,'{"email":"test@testmail.com", "showContacts":false}'::jsonb,'active'::event_status_type,'["lang:English", "color:null","show_visitors:",""]'::jsonb) RETURNING *;`,
        values: [customName, companyId, duration.start, duration.end,]
    };
}

function createStand(companyId, eventId, language, status = 'draft') {
    return {
        text: `INSERT INTO public.stand (company,event,language,status)
	VALUES ($1, $2, $3, $4) RETURNING *;`,
        values: [companyId, eventId, language, status]
    }
}

function createMeeting(url = '') {
    return {
        text: `INSERT INTO meeting (url)
	VALUES ($1) RETURNING *; `,
        values: [url || util.uuid32()]
    };
}

function createActivity(standId, eventId, meetingId, creatorId, moderatorId, presenterId, presenterName, presenterSurname, customName, duration, visibility) {
    return {
        text: `INSERT INTO public.activity (stand,event,meeting,"start","end",value,visibility,creator,tags, custom_name)
        VALUES ($1,$2,$3,$4,$5,
        '{
        "enableQA": true,
        "attendees": [{
            "id": ${moderatorId},
            "role": "moderator"
        }],
        "presenter": {
            "id": ${presenterId},
            "name": "${presenterName}",
            "surname": "${presenterSurname}",
            "position": "presenter"
        },
        "enableChat": true,
        "meetingUrl": "",
        "meetingType": "webinar"
    }'::jsonb,$8::activity_visibility,
    $6,'["type:agenda","wcs-test"]'::jsonb, $7) RETURNING *;`,
        values: [standId, eventId, meetingId, duration.start, duration.end, creatorId, customName || '', visibility || 'stand_public']
    }
}

function createDiscount(id, company, name, definition) {
    return {
        text: `INSERT INTO discount
        (id, company, name, is_active, definition)
        VALUES($1, $2, $3, true, $4);`,
        values: [id, company, name, definition]
    };
}

exports.createCompany = async function (client, name, email) {
    const res = await client.query(createCompany(name, email));
    return res.rows[0];
};

exports.createDiscount = async function (client, discountId, companyId) {
    const result = await client.query(createDiscount(discountId, companyId, 'discount1', { amount: "5%", flags: ["event"] }));
    return result.rows[0];
};

exports.createPersonnelInvintation = async function (client, invintationData) {
    const res = await client.query({
        text: `INSERT INTO personnel_invitation (person_from, email_to, role, position, company, event, stand)
            VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
        values: [invintationData.person_from, invintationData.email_to, invintationData.role,
        invintationData.position || '', invintationData.company || null, invintationData.event || null, invintationData.stand || null]
    });

    return res.rows[0];
}

exports.createEvent = async function (client, customName, companyId, start, end,) {
    const duration = { start: start || new Date(2021, 8, 1, 14, 25, 12), end: end || new Date(2021, 8, 1, 15) }
    const res = await client.query(createEvent(customName, companyId, duration));
    return res.rows[0];
};

exports.createStand = async function (client, companyId, eventId, language, status) {
    const res = await client.query(createStand(companyId, eventId, language, status));
    return res.rows[0];
};
exports.createMeeting = async function (client, url = '') {
    const res = await client.query(createMeeting(url));
    return res.rows[0];
};
exports.createPerson = async function (client, name, surname, email, status) {
    const res = await client.query(createPerson(name, surname, email, status));
    return res.rows[0];
};

exports.createPersonnel = async function (client, personId, standId, companyId, eventId, roleName, position) {
    const res = await client.query({
        text: `INSERT INTO personnel
        (person, stand, company,event,role,position,assigned_at,visible)
        VALUES($1, $2, $3, $4, (Select id from role where name=$5), $6, now(), true) RETURNING *;`,
        values: [personId, standId, companyId, eventId, roleName, position || '']
    });
    return res.rows[0];
}

exports.createActivity = async function (client, standId, eventId, meetingId, creator, moderator, presenter, customName, start, end, visibility) {
    const duration = { start: start || new Date(2021, 8, 1, 14, 25, 12), end: end || new Date(2021, 8, 1, 15) }
    const res = await client.query(createActivity(standId, eventId, meetingId, creator.id, moderator.id, presenter.id, presenter.name, presenter.surname, customName, duration, visibility));
    return res.rows[0];
};

exports.createRoles = async function (client) {
    await client.query(`Insert into role (name, grants) values ('company-helper', '["company-edit","company-manage-news","company-manage-staff"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('company-owner', '["company-edit","company-delete","company-create-event","company-view-reports","company-manage-news","company-manage-staff","company-manage-news","company-manage-sponsorship"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('company-staff', '[]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('event-manager', '["event-edit","event-manage-news","event-manage-staff","event-view-report","event-manage-chat","event-use-chat","event-use-video","event-manage-news","event-manage-sponsorship","event-manage-tickets"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('event-owner', '["event-edit","event-delete","event-manage-news","event-manage-staff","event-manage-money","event-view-report","event-invite-stand","event-manage-chat","event-use-chat","event-use-video","event-manage-news","event-manage-sponsorship","event-manage-tickets"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('event-sales', '["event-use-chat","event-use-video"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('event-speaker', '[]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('event-support', '["event-use-chat"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('platform-manager', '["platform-moderate-event","platform-access-event","platform-access-stand","platform-access-company"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('platform-moderator', '["platform-moderate-event"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('platform-uberadmin', '["platform-moderate-event","platform-access-event","platform-access-stand","platform-access-company","platform-access-audit"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('stand-manager', '["stand-edit","stand-manage-news","stand-manage-staff","stand-view-report","stand-use-chat","stand-use-video","stand-manage-news"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('stand-owner', '["stand-edit","stand-delete","stand-manage-news","stand-manage-staff","stand-view-report","stand-use-chat","stand-use-video","stand-manage-news"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('stand-sales', '["stand-use-chat","stand-use-video"]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('stand-speaker', '[]') ON CONFLICT (name) DO NOTHING;`);
    await client.query(`Insert into role (name, grants) values ('stand-support', '["stand-use-chat"]') ON CONFLICT (name) DO NOTHING;`);
}

exports.truncateAllTables = async function (client) {
    const {rows} = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
        Order BY table_name`);
    if (rows.length){
        const query  = `TRUNCATE ${rows.map(el=>el.table_name).join(',\n')}  CASCADE`;
        await client.query(query);
    }
    client.end();
};

exports.createRoles = async function (client) {
    await client.query(`Insert into role (name, grants) values ('company-helper', '["company-edit","company-manage-news","company-manage-staff"]');`);
    await client.query(`Insert into role (name, grants) values ('company-owner', '["company-edit","company-delete","company-create-event","company-view-reports","company-manage-news","company-manage-staff","company-manage-news","company-manage-sponsorship"]');`);
    await client.query(`Insert into role (name, grants) values ('company-staff', '[]');`);
    await client.query(`Insert into role (name, grants) values ('event-manager', '["event-edit","event-manage-news","event-manage-staff","event-view-report","event-manage-chat","event-use-chat","event-use-video","event-manage-news","event-manage-sponsorship","event-manage-tickets"]');`);
    await client.query(`Insert into role (name, grants) values ('event-owner', '["event-edit","event-delete","event-manage-news","event-manage-staff","event-manage-money","event-view-report","event-invite-stand","event-manage-chat","event-use-chat","event-use-video","event-manage-news","event-manage-sponsorship","event-manage-tickets"]');`);
    await client.query(`Insert into role (name, grants) values ('event-sales', '["event-use-chat","event-use-video"]');`);
    await client.query(`Insert into role (name, grants) values ('event-speaker', '[]');`);
    await client.query(`Insert into role (name, grants) values ('event-support', '["event-use-chat"]');`);
    await client.query(`Insert into role (name, grants) values ('platform-manager', '["platform-moderate-event","platform-access-event","platform-access-stand","platform-access-company"]');`);
    await client.query(`Insert into role (name, grants) values ('platform-moderator', '["platform-moderate-event"]');`);
    await client.query(`Insert into role (name, grants) values ('platform-uberadmin', '["platform-moderate-event","platform-access-event","platform-access-stand","platform-access-company","platform-access-audit"]');`);
    await client.query(`Insert into role (name, grants) values ('stand-manager', '["stand-edit","stand-manage-news","stand-manage-staff","stand-view-report","stand-use-chat","stand-use-video","stand-manage-news"]');`);
    await client.query(`Insert into role (name, grants) values ('stand-owner', '["stand-edit","stand-delete","stand-manage-news","stand-manage-staff","stand-view-report","stand-use-chat","stand-use-video","stand-manage-news"]');`);
    await client.query(`Insert into role (name, grants) values ('stand-sales', '["stand-use-chat","stand-use-video"]');`);
    await client.query(`Insert into role (name, grants) values ('stand-speaker', '[]');`);
    await client.query(`Insert into role (name, grants) values ('stand-support', '["stand-use-chat"]');`);
}


exports.createPerson = async function (client, name, surname, email, status = 'incomplete') {
    const res = await client.query({
        text: `INSERT INTO public.person (name,surname,email,status)
                VALUES ($1,$2,$3,$4) RETURNING *;`,
        values: [name, surname, email, status]
    });

    return res.rows[0];
}

exports.createPricing = async function (client, eventId, pricing_plan, access_price, access_currency, quantity, is_enabled = true) {
    const res = await client.query({
        text: 'INSERT into event_pricing (event, pricing_plan, access_price, access_currency, quantity, status) values ($1, $2, $3, $4, $5, $6::event_pricing_status_type) returning *',
        values: [Number(eventId), pricing_plan, Number(access_price), access_currency,
        Number(quantity), is_enabled?'enabled':'disabled']
    });

    return res.rows[0];
};

exports.createStringsForEntity = async function (client, entity, entityId, type, language, value, isDefault) {
    const res = await client.query({
        text: 'INSERT into Strings(ref, ref_id, category, language, value, is_default) values ($1, $2, $3, $4, $5, $6) returning *',
        values: [entity, entityId, type, language, value, isDefault]
    });

    return res.rows[0];
}

exports.getAllPricingForEvent = async function (client, eventId){
    const query = {
        text: `SELECT *, (status='enabled'::event_pricing_status_type) AS "is_enabled"
               FROM event_pricing ep
               WHERE ep.event = $1
                AND ep.pricing_plan NOT IN ('sponsorship_price')`,
        values: [Number(eventId)]
      };

      const res = await client.query(query);
      return res.rows;    
}