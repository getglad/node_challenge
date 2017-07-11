"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var loader_1 = require("./loader");
/**
 * Script to create 100k records
 * and chain writes + merges of initial data set
 *
 * Is launched on Docker install, or manually from a node console call
 */
var app = new loader_1.AutoPopulationNeo4J();
app.createIndex()
    .then(function (result) {
    app.createSampleData();
    return;
})
    .then(function () {
    return app.uploadSampleBalancers()
        .then(function (result) {
        return;
    });
})
    .then(function () {
    return app.uploadSampleNetwork()
        .then(function (result) {
        return;
    });
})
    .then(function () {
    return app.uploadSampleLinks()
        .then(function (result) {
        console.log('done');
        process.exit();
    });
})
    .catch(function () {
    console.log('uploads have failed');
    process.exit(1);
});
//# sourceMappingURL=preload.js.map