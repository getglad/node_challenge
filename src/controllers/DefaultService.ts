'use strict';

import { NeoSession } from '../neo4j/session';

exports.getDepth = function(args, res, next) {
  /**
   * parameters expected in the args:
   * limitDepth (LimitDepth)
   * limitCount (LimitCount)
   * type1 (Type1)
   * type2 (Type2)
  **/
  const neoSession = new NeoSession();
  args.limitDepth.originalValue.limitCount = Math.min(Math.floor(args.limitDepth.originalValue.limitCount), 300);
  neoSession.runQueryWithParamsDynamicResult(
    `MATCH (n:` + args.limitDepth.originalValue.type1 + `)
     <-[*0..` + Math.min(Math.floor(args.limitDepth.originalValue.limitDepth), 5) + `]-
     (p:` + args.limitDepth.originalValue.type2 + `) 
     RETURN n, p 
     LIMIT $limitCount;`,
     args.limitDepth.originalValue
  ).then((result) => {
    var examples = {};
    examples['application/json'] = result;
    if(Object.keys(examples).length > 0) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(examples[Object.keys(examples)[0]] || {}, null, 2));
    }
    else {
      res.end();
    }
  });
}

exports.getLimit = function(args, res, next) {
  /**
   * parameters expected in the args:
  * limitCount (LimitCount)
  **/

  const neoSession = new NeoSession();
  neoSession.runQueryWithParamsReturnInGraph(
    `MATCH (p:Domain)<-[:Balances]-(a:IP)
     RETURN p.domain as domain, collect(a.ip)
     AS ip limit $limitCount;`,
     args.limitCount.originalValue
  ).then((result) => {
    var examples = {};
    examples['application/json'] = result;
    if(Object.keys(examples).length > 0) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(examples[Object.keys(examples)[0]] || {}, null, 2));
    }
    else {
      res.end();
    }
  });
}

