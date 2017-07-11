"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var faker = require("faker");
var lodash_1 = require("lodash");
var session_1 = require("./session");
/**
 * Class to manage the Autopopulation
 */
var AutoPopulationNeo4J = (function () {
    /**
     * Using default sizes of 100k and 20k blocks for initial build, but overrides can be passed in during operation to add / remove records
     * @param {number=} genCount - the number of records to generate
     * @param {number=} blocks - the size of blocks to create
     * @return
     */
    function AutoPopulationNeo4J(genCount, blocks) {
        if (genCount === void 0) { genCount = 100000; }
        if (blocks === void 0) { blocks = 20000; }
        this.domainList = [];
        this.ipList = [];
        /**
         * Couldn't get Lodash + TypeScript to agree on the types, but they should be:
         * listOfLinks: Array<Array<{domain1: string, domain2: string }>> = [];
         * listOfBalancers: Array<Array<{domain: string, ip: string}>> = [];
         * listOfIPs: Array<Array<{ip1: string, ip2: string}>> = [];
         */
        this.listOfLinks = [];
        this.listOfBalancers = [];
        this.listOfIPs = [];
        this.neoSession = new session_1.NeoSession();
        this.genCount = genCount;
        this.blocks = blocks;
        return;
    }
    /**
     * Create an Index on Neo4J to the domain names and IP address
     * @return {Promise}
     */
    AutoPopulationNeo4J.prototype.createIndex = function () {
        var _this = this;
        this.neoSession.openSession();
        return this.neoSession.session
            .run('CREATE INDEX ON :Domain(domain)')
            .then(function (result) {
            return result;
        })
            .then(function () {
            return _this.neoSession.session
                .run('CREATE INDEX ON :IP(ip)')
                .then(function (result) {
                _this.neoSession.closeSession();
                return result;
            });
        })
            .catch(function (error) {
            console.log(error);
            _this.neoSession.closeSession();
            throw new Error('index creation has failed!');
        });
    };
    /**
     * Generates a sample set of IP address and Domain Names
     * @return
     */
    AutoPopulationNeo4J.prototype.createSampleData = function () {
        // Create IPs
        var ipListMax = Math.min(this.genCount, this.blocks);
        for (var x = 0; x < ipListMax; x++) {
            this.ipList.push({
                ip: faker.internet.ip()
            });
        }
        // shuffle the ip addresses up and zip them together
        var ipList1 = lodash_1.shuffle(this.ipList);
        var ipList2 = lodash_1.shuffle(this.ipList);
        this.listOfIPs = lodash_1.zipWith(ipList1, ipList2, function (a, b) {
            return {
                ip1: a.ip,
                ip2: b.ip
            };
        });
        // Create domains
        for (var x = 0; x < this.genCount; x++) {
            this.domainList.push({
                domain: faker.internet.domainName()
            });
            // Generate subset of domains to help with Neo4J writes and create networks
            if ((x + 1) % this.blocks === 0 ||
                (x + 1) === this.genCount) {
                // shuffle the domains and the ip addresses up and zip them together
                var domains = lodash_1.shuffle(this.domainList);
                var ips = lodash_1.shuffle(this.ipList);
                var domainList = lodash_1.zipWith(domains, ips, function (a, b) {
                    return {
                        domain: a.domain,
                        ip: b.ip
                    };
                });
                this.listOfBalancers = lodash_1.concat(this.listOfBalancers, domainList);
                // do the same with the domain names
                var domains2 = lodash_1.shuffle(this.domainList);
                var linkList = lodash_1.zipWith(domains, domains2, function (a, b) {
                    return {
                        domain1: a.domain,
                        domain2: b.domain
                    };
                });
                this.listOfLinks = lodash_1.concat(this.listOfLinks, linkList);
                this.domainList = [];
            }
        }
        return;
    };
    /**
     * upload the collection of balancers (IP -> Domain) using UNWIND and MERGE together
     * @return {Promise}
     */
    AutoPopulationNeo4J.prototype.uploadSampleBalancers = function () {
        var _this = this;
        // https://stackoverflow.com/questions/44691364/neo4j-sequential-db-transactions-issue
        this.neoSession.closeSession();
        this.neoSession.openSession();
        console.log('start domains');
        return this.neoSession.session
            .run("\n      UNWIND $domains AS domains \n      MERGE (d:Domain { domain: domains.domain }) \n      MERGE (d)<-[:Balances]-(e:IP { ip: domains.ip })", { domains: this.listOfBalancers })
            .then(function (result) {
            _this.neoSession.closeSession();
            console.log('written ' + _this.listOfBalancers.length + ' records');
            return;
        })
            .catch(function (error) {
            _this.neoSession.closeSession();
            console.log(error);
            throw new Error('domains have failed!');
        });
    };
    /**
     * upload the collection of networks (IP->IP) using UNWIND and MERGE together
     * @return {Promise}
     */
    AutoPopulationNeo4J.prototype.uploadSampleNetwork = function () {
        var _this = this;
        this.neoSession.closeSession();
        this.neoSession.openSession();
        console.log('start ips');
        return this.neoSession.session
            .run("\n      UNWIND $ips AS ips \n      MERGE (d:IP { ip: ips.ip1 }) \n      MERGE (d)<-[:Networked]-(e:IP { ip: ips.ip2 })", { ips: this.listOfIPs })
            .then(function (result) {
            _this.neoSession.closeSession();
            console.log('written ' + _this.listOfIPs.length + ' records');
            return;
        })
            .catch(function (error) {
            console.log(error);
            _this.neoSession.closeSession();
            throw new Error('networks have failed!');
        });
    };
    /**
     * upload the collection of networks (Domain->Domain) using UNWIND and MERGE together
     * @return {Promise}
     */
    AutoPopulationNeo4J.prototype.uploadSampleLinks = function () {
        var _this = this;
        this.neoSession.closeSession();
        this.neoSession.openSession();
        console.log('start links');
        return this.neoSession.session
            .run("\n        UNWIND $links AS links \n        MERGE (d:Domain { domain: links.domain1 }) \n        MERGE (d)<-[:LinkedTo]-(e:Domain { domain: links.domain2 })", { links: this.listOfLinks })
            .then(function (result) {
            _this.neoSession.closeSession();
            console.log('written ' + _this.listOfLinks.length + ' records');
            return;
        })
            .catch(function (error) {
            _this.neoSession.closeSession();
            console.log(error);
            throw new Error('links have failed!');
        });
    };
    /**
     * simple helper for Q&D queries
     * it is here for now in order to use session + auto generated records
     * @param {string} queryString - the Neo4J query to run
     * @return {Promise}
     */
    AutoPopulationNeo4J.prototype.runQuery = function (queryString) {
        var _this = this;
        this.neoSession.openSession();
        var readTxResultPromise = this.neoSession.session.readTransaction(function (transaction) {
            var result = transaction.run(queryString);
            return result;
        });
        return readTxResultPromise
            .then(function (result) {
            _this.neoSession.closeSession();
            return result;
        })
            .catch(function (error) {
            console.log(error);
            _this.neoSession.closeSession();
            return error;
        });
    };
    return AutoPopulationNeo4J;
}());
exports.AutoPopulationNeo4J = AutoPopulationNeo4J;
/**
 * Class to manage the random creation and deletion of records
 */
var RandomRecordChanges = (function () {
    function RandomRecordChanges() {
    }
    /**
     * Runs random Read and Deletes every 2 minutes
     */
    RandomRecordChanges.prototype.startRunningRandomAddDelete = function () {
        setInterval(this.removeRecords, 120000);
        setInterval(this.addRecords, 120000);
        return;
    };
    /**
     * Delete random number of records using skip and limit
     * @return {Promise}
     */
    RandomRecordChanges.prototype.removeRecords = function () {
        var app = new AutoPopulationNeo4J();
        var skipInt = new RandomNumber().getRandomInt(0, 100000);
        var limitInt = new RandomNumber().getRandomInt(0, 100);
        var nodeTypeArray = [
            'Domain',
            'IP'
        ];
        var nodeType = nodeTypeArray[new RandomNumber().getRandomInt(1, 2)];
        return app.runQuery("MATCH (n:" + nodeType + ")\n      WITH n \n      SKIP " + skipInt + " \n      LIMIT " + limitInt + " \n      DETACH DELETE n;")
            .then(function (result) {
            console.log('removed records');
            return;
        })
            .catch(function (error) {
            console.log(error);
            throw new Error('deletes have failed!');
        });
    };
    /**
     * Add random number of records using AutoPopulationNeo4J
     * @return {Promise}
     */
    RandomRecordChanges.prototype.addRecords = function () {
        var app = new AutoPopulationNeo4J(new RandomNumber().getRandomInt(0, 1000));
        app.createSampleData();
        return app.uploadSampleBalancers()
            .then(function () {
            return app.uploadSampleNetwork()
                .then(function (result) {
                return;
            });
        })
            .then(function () {
            return app.uploadSampleLinks()
                .then(function (result) {
                return;
            });
        })
            .then(function (result) {
            console.log('new data added');
            return;
        })
            .catch(function (error) {
            console.log(error);
            throw new Error('uploads have failed!');
        });
    };
    return RandomRecordChanges;
}());
exports.RandomRecordChanges = RandomRecordChanges;
// Class to generate a random number, used primarily for randomly sized events
var RandomNumber = (function () {
    function RandomNumber() {
    }
    /**
     * Generate an random Int between two numbers
     * @param {number} min - the lowest value allowed
     * @param {number} max - the highest value allowed
     * @return {number}
     */
    RandomNumber.prototype.getRandomInt = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    };
    return RandomNumber;
}());
exports.RandomNumber = RandomNumber;
//# sourceMappingURL=loader.js.map