import * as faker from 'faker';
import { v1 } from 'neo4j-driver';
import { concat, map, shuffle, zipWith } from 'lodash';

import { NeoSession } from './session';

/**
 * Class to manage the Autopopulation
 */
export class AutoPopulationNeo4J {
  domainList: Array<{domain: string}> = [];
  ipList: Array<{ip: string}> = [];
  /**
   * Couldn't get Lodash + TypeScript to agree on the types, but they should be:
   * listOfLinks: Array<Array<{domain1: string, domain2: string }>> = [];
   * listOfBalancers: Array<Array<{domain: string, ip: string}>> = [];
   * listOfIPs: Array<Array<{ip1: string, ip2: string}>> = [];
   */
  listOfLinks: Array<any> = [];
  listOfBalancers: Array<any> = [];
  listOfIPs: Array<any> = [];
  genCount: number;
  blocks: number;

  neoSession: NeoSession = new NeoSession();
  /**
   * Using default sizes of 100k and 20k blocks for initial build, but overrides can be passed in during operation to add / remove records
   * @param {number=} genCount - the number of records to generate
   * @param {number=} blocks - the size of blocks to create
   * @return
   */ 
  constructor(genCount = 100000, blocks = 20000) {
    this.genCount = genCount;
    this.blocks = blocks;
    return;
  }

  /**
   * Create an Index on Neo4J to the domain names and IP address
   * @return {Promise}
   */
  createIndex(): Promise<any> {
    this.neoSession.openSession();
    return this.neoSession.session
      .run('CREATE INDEX ON :Domain(domain)')
      .then((result) => {
        return result;
      })
      .then(() => {
        return this.neoSession.session
          .run('CREATE INDEX ON :IP(ip)')
          .then((result) => {
            this.neoSession.closeSession();
            return result;
          });
      })
      .catch((error) => {
        console.log(error);
        this.neoSession.closeSession();
        throw new Error('index creation has failed!');
      });
  }

  /**
   * Generates a sample set of IP address and Domain Names
   * @return
   */
  createSampleData(): void {
    // Create IPs
    const ipListMax = Math.min(this.genCount, this.blocks);
    for (let x = 0; x < ipListMax; x++) {
      this.ipList.push({
        ip:  faker.internet.ip()
      });
    }
    // shuffle the ip addresses up and zip them together
    const ipList1 = shuffle(this.ipList);
    const ipList2 = shuffle(this.ipList);
    this.listOfIPs = zipWith(
      ipList1, ipList2, (a,b) => {
      return {
        ip1: a.ip,
        ip2: b.ip
      };
    });
    // Create domains
    for (let x = 0; x < this.genCount; x++) {
      this.domainList.push({
        domain:  faker.internet.domainName()
      });
      // Generate subset of domains to help with Neo4J writes and create networks
      if (
        (x+1) % this.blocks === 0 || 
        (x+1) === this.genCount
      ) {
        // shuffle the domains and the ip addresses up and zip them together
        const domains = shuffle(this.domainList);
        const ips = shuffle(this.ipList);
        const domainList = zipWith(domains, ips, (a,b) => {
          return {
            domain: a.domain,
            ip: b.ip
          };
        });
        this.listOfBalancers = concat(this.listOfBalancers, domainList);
        // do the same with the domain names
        const domains2 = shuffle(this.domainList);
        const linkList = zipWith(domains, domains2, (a,b) => {
          return {
            domain1: a.domain,
            domain2: b.domain
          };
        });
        this.listOfLinks = concat(this.listOfLinks, linkList);
        this.domainList = [];
      }
    }
    return;
  }

  /**
   * upload the collection of balancers (IP -> Domain) using UNWIND and MERGE together
   * @return {Promise}
   */ 
  uploadSampleBalancers(): Promise<any> {
    // https://stackoverflow.com/questions/44691364/neo4j-sequential-db-transactions-issue
    this.neoSession.closeSession();
    this.neoSession.openSession();
    console.log('start domains');
    return this.neoSession.session
    .run(`
      UNWIND $domains AS domains 
      MERGE (d:Domain { domain: domains.domain }) 
      MERGE (d)<-[:Balances]-(e:IP { ip: domains.ip })`,
      {domains: this.listOfBalancers})
    .then((result) => {
      this.neoSession.closeSession();
      console.log('written ' + this.listOfBalancers.length + ' records');
      return;
    })
    .catch((error) => {
      this.neoSession.closeSession();
      console.log(error);
      throw new Error('domains have failed!');
    })
  }

  /**
   * upload the collection of networks (IP->IP) using UNWIND and MERGE together
   * @return {Promise}
   */
  uploadSampleNetwork(): Promise<any> {
    this.neoSession.closeSession();
    this.neoSession.openSession();
    console.log('start ips');
    return this.neoSession.session
    .run(`
      UNWIND $ips AS ips 
      MERGE (d:IP { ip: ips.ip1 }) 
      MERGE (d)<-[:Networked]-(e:IP { ip: ips.ip2 })`,
      {ips: this.listOfIPs})
    .then((result) => {
      this.neoSession.closeSession();
      console.log('written ' + this.listOfIPs.length + ' records');
      return;
    })
    .catch((error) => {
      console.log(error);
      this.neoSession.closeSession();
      throw new Error('networks have failed!');
    });
  }

  /**
   * upload the collection of networks (Domain->Domain) using UNWIND and MERGE together
   * @return {Promise}
   */
  uploadSampleLinks(): Promise<any> {
    this.neoSession.closeSession();
    this.neoSession.openSession();
    console.log('start links');
    return this.neoSession.session
      .run(`
        UNWIND $links AS links 
        MERGE (d:Domain { domain: links.domain1 }) 
        MERGE (d)<-[:LinkedTo]-(e:Domain { domain: links.domain2 })`,
        {links: this.listOfLinks})
      .then((result) => {
        this.neoSession.closeSession();
        console.log('written ' + this.listOfLinks.length + ' records');
        return;
      })
      .catch((error) => {
        this.neoSession.closeSession();
        console.log(error);
        throw new Error('links have failed!');
      })
  }

  /**
   * simple helper for Q&D queries
   * it is here for now in order to use session + auto generated records
   * @param {string} queryString - the Neo4J query to run
   * @return {Promise}
   */
  runQuery(queryString: string): Promise<any> {
    this.neoSession.openSession();
    const readTxResultPromise = this.neoSession.session.readTransaction((transaction) => {
      const result = transaction.run(queryString);
      return result;
    });
    return readTxResultPromise
      .then((result) => {
        this.neoSession.closeSession();
        return result;
      })
      .catch((error) => {
        console.log(error);
        this.neoSession.closeSession();
        return error;
      });
  }
}

/**
 * Class to manage the random creation and deletion of records
 */
export class RandomRecordChanges {
  constructor() {}

  /**
   * Runs random Read and Deletes every 2 minutes
   */
  startRunningRandomAddDelete(): void {
    setInterval(this.removeRecords, 120000);
    setInterval(this.addRecords, 120000);
    return;
  }

  /**
   * Delete random number of records using skip and limit
   * @return {Promise}
   */
  removeRecords(): Promise<any> {
    const app = new AutoPopulationNeo4J();
    const skipInt = new RandomNumber().getRandomInt(0, 100000);
    const limitInt = new RandomNumber().getRandomInt(0, 100);
    var nodeTypeArray = [
      'Domain',
      'IP'
    ];
    const nodeType = nodeTypeArray[new RandomNumber().getRandomInt(1, 2)];
    return app.runQuery(
      `MATCH (n:` + nodeType + `)
      WITH n 
      SKIP ` + skipInt + ` 
      LIMIT ` + limitInt + ` 
      DETACH DELETE n;`
    )
    .then((result) => {
      console.log('removed records');
      return;
    })
    .catch((error) => {
      console.log(error);
      throw new Error('deletes have failed!');
    });
  }

  /**
   * Add random number of records using AutoPopulationNeo4J
   * @return {Promise}
   */
  addRecords(): Promise<any> {
    const app = new AutoPopulationNeo4J(new RandomNumber().getRandomInt(0, 1000));
    app.createSampleData();
    return app.uploadSampleBalancers()
    .then(() => {
      return app.uploadSampleNetwork()
      .then((result) => {
        return;
      });
    })
    .then(() =>{
      return app.uploadSampleLinks()
      .then((result) => {
        return;
      });
    })
    .then((result) => {
      console.log('new data added');
      return;
    })
    .catch((error) => {
      console.log(error);
      throw new Error('uploads have failed!');
    });
  }
}

// Class to generate a random number, used primarily for randomly sized events
export class RandomNumber {
  constructor() {}

  /**
   * Generate an random Int between two numbers
   * @param {number} min - the lowest value allowed 
   * @param {number} max - the highest value allowed
   * @return {number}
   */
  getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }
}