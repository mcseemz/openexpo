require('dotenv/config');
const { assert } = require('chai');
const { Pool, Client } = require('pg');
const SUT = require('../../lambdas/API/model/discount');
const util = require('../../lambdas/API/model/util');
const testQueries = require('./testQueries');

const client = new Client({});

describe('discount model', function () {
    this.beforeAll(async function () {
        await client.connect();
    });

    describe('getDiscountFromDbOrThrowException', function () {
        it("should find and return object", async function () {
            // //Arrange
            // const sample = {};
            // sample.company = await testQueries.createCompany(client);
            // sample.discountId = util.uuid32();
            // sample.discount = await testQueries.createDiscount(client, sample.discountId,  sample.company.id);
            // //Act
            // const discount = await SUT.getDiscountFromDbOrThrowException(client, sample.discountId);
            // //Assert
            // assert.isObject(discount);
            // assert.equal(discount.id, sample.discountId);            
        });
    });

    this.afterAll(async function () {
        await testQueries.truncateAllTables(client);
    });
});