require('dotenv/config');
const { assert } = require('chai');
const { Client } = require('pg');
const personUtil = require('../../lambdas/API/model/person');
const eventUtil = require('../../lambdas/API/model/event');
const standUtil = require('../../lambdas/API/model/stand');
const SUT = require('../../lambdas/API/model/personnel');
const testQueries = require('./testQueries');

async function assignUserToCompanyAndReturn(client, userId, companyId, userPosition=''){
    
    await SUT.assignUserToCompanyWithParameters(client, userId, companyId, 'company-owner',userPosition, true);
    let query = {
        text: 'select * from personnel where person = $1 and company = $2',
        values: [Number(userId), Number(companyId)]
    };
    const res = await client.query(query);
    return res.rows[0];
}

async function assignUserToEventAndReturn(client, userId, eventId, userPosition=''){
    await SUT.assignUserToEventWithParameters(client, userId, eventId, 'event-owner', userPosition);
    let query = {
        text: 'select * from personnel where person = $1 and event = $2',
        values: [Number(userId), Number(eventId)]
      };
      const res = await client.query(query);
      return res.rows[0];
}

async function assignUserToStandAndReturn(client, userId, standId, userPosition=''){
    await SUT.assignUserToStandWithParameters(client, userId, standId, 'stand-owner', userPosition);
    let query = {
        text: 'select * from personnel where person = $1 and stand = $2',
        values: [Number(userId), Number(standId)]
      };
    const res = await client.query(query);
    return res.rows[0];
}

describe("personnel model", function(){
    const client = new Client({});
    const sample = {};

    this.beforeAll(async function () {
        await client.connect();
        testQueries.createRoles(client);
    });

    describe("assignUserToCompanyWithParameters", function(){
        it('should assign user to company', async function(){
            //Arrenge
            sample.company = await testQueries.createCompany(client);
            sample.user = await personUtil.createUserInDb(client, { email: 'xabcd@yahoo.com', name: 'John', surname: 'Wick' });
            //Act
            const personnel = await assignUserToCompanyAndReturn(client, sample.user.id, sample.company.id, 'Company owner');
            //Assert
            assert.isObject(personnel);
        });
        
        it("should update user position at the event", async function(){
            //Arrenge
            const position = 'Event Driver!'
            const res = await client.query(`SELECT person, company FROM personnel WHERE company NOTNULL LIMIT 1`);
            const data  = res.rows[0];
            //Act
            const personnel = await assignUserToCompanyAndReturn(client, data.person, data.company, position);
            //Assert
            assert.isObject(personnel);
            assert.equal(personnel.position, position);
        });
    });

    describe("assignUserToEventWithParameters", function(){
        it("should assign user to an event with a role", async function(){
            //Arrenge
            sample.dataEvent = {'dateStart':'2021-07-28 04:15:00', 'dateEnd':'2021-08-31 20:45:00', 'timezone':'7', 'company':sample.company.id};
            sample.user = await personUtil.createUserInDb(client, { email: 'jungle@yahoo.com', name: 'Kyle', surname: 'Norris' });
            sample.event = await eventUtil.createEventInDb(client, sample.dataEvent, sample.user['id']);
            //Act
            const personnel = await assignUserToEventAndReturn(client, sample.user.id, sample.event.id, sample.user.position);
            //Assert
            assert.isObject(personnel);
        });

        it("should update user position at the event", async function(){
            //Arrenge
            const position = 'Event Driver!'
            const res = await client.query(`SELECT person, event FROM personnel WHERE event NOTNULL LIMIT 1`);
            const data  = res.rows[0];
            //Act
            const personnel = await assignUserToEventAndReturn(client, data.person, data.event, position);
            //Assert
            assert.isObject(personnel);
            assert.equal(personnel.position, position);
        });
    });

    describe("assignUserToStandWithParameters", function(){
        it("should assign user to a stand", async function(){
            //Arrenge
            sample.language = 'en_GB';
            sample.user = await personUtil.createUserInDb(client, { email: 'third@ods.com', name: 'Lyu', surname: 'Kang' });
            sample.stand = await standUtil.createStandInDb(client, sample.company.id, sample.event.id, sample.language, sample.user.id);
            //Act
            const personnel = await assignUserToStandAndReturn(client, sample.user['id'], sample.stand['id'] );
            //Assert
            assert.isObject(personnel);
        });

        it("should update user position at the stand", async function(){
            //Arrenge
            const position = 'The Boss!'
            const res = await client.query(`SELECT person, stand FROM personnel WHERE stand NOTNULL LIMIT 1`);
            const data  = res.rows[0];
            //Act
            const personnel = await assignUserToStandAndReturn(client, data.person, data.stand, position);
            //Assert
            assert.isObject(personnel);
            assert.equal(personnel.position, position);
        });
    });

    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});

exports.assignUserToCompanyAndReturn = assignUserToCompanyAndReturn;