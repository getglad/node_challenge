var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;

var { AutoPopulationNeo4J } = require('../dist/neo4j/loader');

var { NeoSession } = require('../dist/neo4j/session');

describe('Loader', function() {
  const app = new AutoPopulationNeo4J();

  describe('Create Index', function() {
    it('should return a positive result after creating index', function() {
      return app.createIndex().then((result) => {
        assert.ok(true);
      });
    });
  })

  app.createSampleData();

  describe('Create Sample Data', function() {

    it('should create a list of 100k balancers', function() {
      expect(app.listOfBalancers).to.have.length(100000);
    });

    it('should create a list of 100k links', function() {
      expect(app.listOfLinks).to.have.length(100000);
    });

    it('should create a list of 20k networks', function() {
      expect(app.listOfIPs).to.have.length(20000);
    });
  })

  describe('Run a basic query', function() {
    it('should run a basic query without error', function() {
      app.runQuery(`MATCH (n:Domain) RETURN n LIMIT 25`).then((result) => {
        assert.ok(true);
      });
    });
  });

  /**
   * TO DO - Not 100% certain the best way to test against Neo4J writes w/o standby dev install
   */
});

describe('Session', function() {
  const app = new NeoSession();

  describe('Open and Close Sesssions', function() {
    it('should open a session without error', function() {
      app.openSession();
      assert.ok(true);
    });

    it('should close a session without error', function() {
      app.closeSession();
      assert.ok(true);
    });
  });

  describe('Check For Depth Relationship Query', function() {
    it('should return 5 records', function() {
      return app.runQueryWithParamsDynamicResult(
        `MATCH (n:Domain)
        <-[*1..3]-
        (p:Domain) 
        RETURN n, p 
        LIMIT $limitCount;`, {limitCount:5}
      ).then((results) => {
        expect(results.results.records).to.have.length(5);
      });
    });
  });

  describe('Check For Basic Relationship Query', function() {
    it('should return 5 records', function() {
      return app.runQueryWithParamsReturnInGraph(
        `MATCH (p:Domain)<-[:Balances]-(a:IP)
         RETURN p.domain as domain, collect(a.ip)
          AS ip limit $limitCount;`, {limitCount:5}
      ).then((results) => {
        expect(results.results.records).to.have.length(5);
      });
    });
  });
});