require('dotenv/config');
const { assert } = require('chai');
const { Pool, Client } = require('pg');
const SUT = require('../../lambdas/API/model/company');
const userUtil = require('../../lambdas/API/model/person');
const testQueries = require('./testQueries');

describe("company model", function(){
    const client = new Client({});

    this.beforeAll(async function () {
        await client.connect();
    });

    describe('createCompanyIfNotExistsForUser', function () {
        it("should create company and return it's id", async function () {
            //Arrange
            const sample = {};
            sample.user = await userUtil.createUserInDb(client, {email:'somemail@mail.com', name:'John', surname:'Doe'});
            //Act
            const company = await SUT.createCompanyIfNotExistsForUser(client, sample.user);
            //Assert
            assert.isNumber(company);          
        });
    });

    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});