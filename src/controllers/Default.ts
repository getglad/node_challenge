'use strict';

var url = require('url');


var Default = require('./DefaultService');


module.exports.getDepth = function getDepth (req, res, next) {
  Default.getDepth(req.swagger.params, res, next);
};

module.exports.getLimit = function getLimit (req, res, next) {
  Default.getLimit(req.swagger.params, res, next);
};
