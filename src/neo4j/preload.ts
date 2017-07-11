import { AutoPopulationNeo4J } from './loader';

/**
 * Script to create 100k records
 * and chain writes + merges of initial data set
 * 
 * Is launched on Docker install, or manually from a node console call
 */

const app = new AutoPopulationNeo4J();
app.createIndex()
  .then((result) => {
    app.createSampleData();
    return;
  })
  .then(() => {
    return app.uploadSampleBalancers()
    .then((result) => {
      return;
    });
  })
  .then(() => {
    return app.uploadSampleNetwork()
    .then((result) => {
      return;
    });
  })
  .then(() => {
    return app.uploadSampleLinks()
    .then((result) => {
      console.log('done');
      process.exit();
    });
  })
  .catch(() => {
    console.log('uploads have failed');
    process.exit(1);
  });