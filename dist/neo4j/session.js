"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var neo4j_driver_1 = require("neo4j-driver");
/**
 * Class to manage the session the Neo4J and send specific queries attached to the API
 */
var NeoSession = (function () {
    /**
     * @return
     */
    function NeoSession() {
        this.neo4jURI = process.env.neo4jURI;
        this.neo4jUser = process.env.neo4jUser;
        this.neo4jPassword = process.env.neo4jPassword;
    }
    /**
     * Open a Neo4J Session
     * @return
     */
    NeoSession.prototype.openSession = function () {
        if (this.hasOwnProperty('session'))
            this.session.close();
        this.driver = neo4j_driver_1.v1.driver(this.neo4jURI, neo4j_driver_1.v1.auth.basic(this.neo4jUser, this.neo4jPassword));
        this.session = this.driver.session();
        return;
    };
    /**
     * Close a Neo4J Session
     * @return
     */
    NeoSession.prototype.closeSession = function () {
        if (this.hasOwnProperty('session'))
            this.session.close();
        return;
    };
    /**
     * Use parameters to build the query and traverse the result
     * @param {string} queryString - the Neo4J Query String
     * @param {object} props - the params specific to the query
     * @return {Promise} Contains nodes, links, and the original result
     */
    NeoSession.prototype.runQueryWithParamsDynamicResult = function (queryString, props) {
        var _this = this;
        this.openSession();
        var readTxResultPromise = this.session.readTransaction(function (transaction) {
            var result = transaction.run(queryString, props);
            return result;
        });
        return readTxResultPromise.then(function (results) {
            var nodes = [], rels = [];
            var i = 0;
            lodash_1.forEach(results.records, function (res) {
                nodes.push({ title: res.get('n'), label: props['type1'] });
                var target = i;
                i++;
                lodash_1.forEach(res.get('p'), function (name) {
                    var ip = { title: name, label: props['type2'] };
                    var source = lodash_1.findIndex(nodes, ip);
                    if (source === -1) {
                        nodes.push(ip);
                        source = i;
                        i++;
                    }
                    rels.push({ source: source, target: target });
                });
            });
            _this.closeSession();
            return { nodes: nodes, links: rels, results: results };
        })
            .catch(function (error) {
            console.log(error);
            return error;
        });
    };
    /**
     * Run a transaction on a string from a controller
     * @param {string} queryString - the Neo4J Query String
     * @param {object} props - the params specific to the query
     * @return {Promise} Contains nodes, links, and the original result
     */
    NeoSession.prototype.runQueryWithParamsReturnInGraph = function (queryString, props) {
        var _this = this;
        this.openSession();
        var readTxResultPromise = this.session.readTransaction(function (transaction) {
            var result = transaction.run(queryString, props);
            return result;
        });
        return readTxResultPromise.then(function (results) {
            // https://github.com/neo4j/neo4j-javascript-driver/issues/140
            var nodes = [], rels = [];
            var i = 0;
            lodash_1.forEach(results.records, function (res) {
                nodes.push({ title: res.get('domain'), label: 'domain' });
                var target = i;
                i++;
                lodash_1.forEach(res.get('ip'), function (name) {
                    var ip = { title: name, label: 'IP' };
                    var source = lodash_1.findIndex(nodes, ip);
                    if (source === -1) {
                        nodes.push(ip);
                        source = i;
                        i++;
                    }
                    rels.push({ source: source, target: target });
                });
            });
            _this.closeSession();
            return { nodes: nodes, links: rels, results: results };
        })
            .catch(function (error) {
            console.log(error);
            return error;
        });
    };
    return NeoSession;
}());
exports.NeoSession = NeoSession;
//# sourceMappingURL=session.js.map