import * as connect from 'connect';
import * as cors from 'cors';
import * as http from 'http';
import * as swaggerTools from 'swagger-tools';
import * as jsyaml from 'js-yaml';
import * as fs from 'fs';

import { RandomRecordChanges } from './neo4j/loader';

const serverPort = 8080;
const app: connect.Server = connect();

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
    new RandomRecordChanges().startRunningRandomAddDelete();
  });
});