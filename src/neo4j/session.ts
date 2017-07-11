import { forEach, findIndex } from 'lodash';
import { v1 } from 'neo4j-driver';
/**
 * Class to manage the session the Neo4J and send specific queries attached to the API
 */
export class NeoSession {
  session;
  driver;

  neo4jURI: string = process.env.neo4jURI;
  neo4jUser: string = process.env.neo4jUser;
  neo4jPassword: string = process.env.neo4jPassword;

  /**
   * @return
   */
  constructor() { }

  /**
   * Open a Neo4J Session
   * @return
   */ 
  openSession(): void {
    if (this.hasOwnProperty('session'))
      this.session.close();
    this.driver = v1.driver(this.neo4jURI, v1.auth.basic(this.neo4jUser, this.neo4jPassword));
    this.session = this.driver.session();
    return;
  }

  /**
   * Close a Neo4J Session
   * @return 
   */
  closeSession(): void {
    if (this.hasOwnProperty('session'))
      this.session.close();
    return;
  }

  /**
   * Use parameters to build the query and traverse the result
   * @param {string} queryString - the Neo4J Query String
   * @param {object} props - the params specific to the query
   * @return {Promise} Contains nodes, links, and the original result
   */
  runQueryWithParamsDynamicResult(queryString: String, props: Object): Promise<{nodes: Array<any>, links: Array<any>, results: Array<any>}> {
    this.openSession();
    const readTxResultPromise = this.session.readTransaction((transaction) => {
      const result = transaction.run(queryString, props);
      return result;
    });
    return readTxResultPromise.then((results) => {
      const nodes = [], rels = [];
      let i = 0;
      forEach(results.records, (res) => {
        nodes.push({title: res.get('n'), label: props['type1']});
        const target = i;
        i++;
        forEach(res.get('p'), (name) => {
          const ip = {title: name, label: props['type2']};
          let source = findIndex(nodes, ip);
          if (source === -1) {
            nodes.push(ip);
            source = i;
            i++;
          }
          rels.push({source, target})
        });
      });
      this.closeSession();
      return {nodes, links: rels, results};
    })
    .catch((error) => {
      console.log(error);
      return error;
    });
  }

  /**
   * Run a transaction on a string from a controller
   * @param {string} queryString - the Neo4J Query String
   * @param {object} props - the params specific to the query
   * @return {Promise} Contains nodes, links, and the original result
   */
  runQueryWithParamsReturnInGraph(queryString: String, props: Object): Promise<{nodes: Array<any>, links: Array<any>, results: Array<any>}> {
    this.openSession();
    const readTxResultPromise = this.session.readTransaction((transaction) => {
      const result = transaction.run(queryString, props);
      return result;
    });
    return readTxResultPromise.then((results) => {
      // https://github.com/neo4j/neo4j-javascript-driver/issues/140
      const nodes = [], rels = [];
      let i = 0;
      forEach(results.records, (res) => {
        nodes.push({title: res.get('domain'), label: 'domain'});
        const target = i;
        i++;
        forEach(res.get('ip'), (name) => {
          const ip = {title: name, label: 'IP'};
          let source = findIndex(nodes, ip);
          if (source === -1) {
            nodes.push(ip);
            source = i;
            i++;
          }
          rels.push({source, target})
        });
      });
      this.closeSession();
      return {nodes, links: rels, results};
    })
    .catch((error) => {
      console.log(error);
      return error;
    });
  }
}
