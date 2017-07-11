"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var connect = require("connect");
var cors = require("cors");
var http = require("http");
var swaggerTools = require("swagger-tools");
var jsyaml = require("js-yaml");
var fs = require("fs");
var loader_1 = require("./neo4j/loader");
var serverPort = 8080;
var app = connect();
// swaggerRouter configuration
var options = {
    swaggerUi: '/swagger.json',
    controllers: __dirname + '/controllers',
    useStubs: process.env.NODE_ENV === 'development' ? true : false // Conditionally turn on stubs (mock mode)
};
// The Swagger document (require it, build it programmatically, fetch it from a URL, ...)
var spec = fs.readFileSync(__dirname + '/api/swagger.yaml', 'utf8');
var swaggerDoc = jsyaml.safeLoad(spec);
// Initialize the Swagger middleware
swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {
    app.use(cors());
    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata());
    // Validate Swagger requests
    app.use(middleware.swaggerValidator());
    // Route validated requests to appropriate controller
    app.use(middleware.swaggerRouter(options));
    // Serve the Swagger documents and Swagger UI
    app.use(middleware.swaggerUi());
    // Start the server
    http.createServer(app).listen(serverPort, function () {
        console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
        console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
        // Start random add and deletes to Neo4J 
        new loader_1.RandomRecordChanges().startRunningRandomAddDelete();
    });
});
//# sourceMappingURL=index.js.map