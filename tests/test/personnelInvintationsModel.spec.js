require('dotenv/config');
const { assert } = require('chai');
const { Client } = require('pg');
const personUtil = require('../../lambdas/API/model/person');
const eventUtil = require('../../lambdas/API/model/event');
const standUtil = require('../../lambdas/API/model/stand');
const SUT = require('../../lambdas/API/model/personnelInvitation');
const testQueries = require('./testQueries');

describe('personnelInvintation', function(){
    const client = new Client({});
    const sample = {};

    this.beforeAll(async function () {
        await client.connect();
        testQueries.createRoles(client);
    });

    describe('getInvitationById', function(){
        it('should return personnel invitation data supplemented with role name', async function(){
            //Arrenge
            sample.company = await testQueries.createCompany(client);
            sample.person = await testQueries.createPerson(client, 'Agent', 'Smith', 'sentinel@gmail.com');
            const res = await client.query({text:`SELECT * FROM role LIMIT 1;`});
            sample.role = res.rows[0];
            const invintationData = {"person_from": sample.person.id, "email_to": 'personnel@somemail.com', "role": sample.role.id, "position": 'company-helper', "company": sample.company.id};
            sample.invintation = await testQueries.createPersonnelInvintation(client, invintationData);
            //Act
            const invintation = await SUT.getInvitationById(client, sample.invintation.id);
            //Assert
            assert.isObject(invintation);
            assert.equal(sample.role.name, invintation.role_name);
        });
    });
    
    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});