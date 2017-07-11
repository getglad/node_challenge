'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var session_1 = require("../neo4j/session");
exports.getDepth = function (args, res, next) {
    /**
     * parameters expected in the args:
     * limitDepth (LimitDepth)
     * limitCount (LimitCount)
     * type1 (Type1)
     * type2 (Type2)
    **/
    var neoSession = new session_1.NeoSession();
    args.limitDepth.originalValue.limitCount = Math.min(Math.floor(args.limitDepth.originalValue.limitCount), 300);
    neoSession.runQueryWithParamsDynamicResult("MATCH (n:" + args.limitDepth.originalValue.type1 + ")\n     <-[*0.." + Math.min(Math.floor(args.limitDepth.originalValue.limitDepth), 5) + "]-\n     (p:" + args.limitDepth.originalValue.type2 + ") \n     RETURN n, p \n     LIMIT $limitCount;", args.limitDepth.originalValue).then(function (result) {
        var examples = {};
        examples['application/json'] = result;
        if (Object.keys(examples).length > 0) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(examples[Object.keys(examples)[0]] || {}, null, 2));
        }
        else {
            res.end();
        }
    });
};
exports.getLimit = function (args, res, next) {
    /**
     * parameters expected in the args:
    * limitCount (LimitCount)
    **/
    var neoSession = new session_1.NeoSession();
    neoSession.runQueryWithParamsReturnInGraph("MATCH (p:Domain)<-[:Balances]-(a:IP)\n     RETURN p.domain as domain, collect(a.ip)\n     AS ip limit $limitCount;", args.limitCount.originalValue).then(function (result) {
        var examples = {};
        examples['application/json'] = result;
        if (Object.keys(examples).length > 0) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(examples[Object.keys(examples)[0]] || {}, null, 2));
        }
        else {
            res.end();
        }
    });
};
//# sourceMappingURL=DefaultService.js.map