var moment = require('moment');
var zanoxCom = require('../dal/zanoxCom.js');
var url = require('url');
var http = require('http');
var MyError = require('../MyError.js');

module.exports = {
  process: function(zanox_url, watzdprice_url, shop, cb) {
    var start = moment().format();
    var added = 0;
    var updated = 0;
    var urlDetails = url.parse(watzdprice_url);
    zanoxCom.getZanoxComData(zanox_url, function (record, cb) {
      if (record[5]!=='price') { // first row
        try {
          var product = JSON.stringify({
            name: record[1].substring(0,255),
            description: record[2].substring(0,1999),
            shop: shop,
            brand: record[13].substring(0,255),
            eancode: record[10].substring(0,255),
            category: record[14].substring(0,255),
            url: record[0].substring(0,1999),
            image: record[4].substring(0,1999),
            price: parseFloat(record[5]),
            datetime: moment().format()});
        } catch (err) {
          return cb();
        }
       putProduct(urlDetails, product, function (err, operation) {
          if (err) {
            return cb(new MyError('ERROR', 'process', 'Error', {zanox_url: zanox_url, watzdprice_url: watzdprice_url, shop: shop}, err));
          }
          if (operation === 'added') {
            added++;
          }
          if (operation === 'updated') {
            updated++;
          }
          cb();
        });
      }
    }, function () {
      postShopLoadStats(urlDetails, JSON.stringify({
        shop: shop,
        start: start,
        end: moment().format(),
        added: added,
        updated: updated
      }), function (err) {
        if (err) {
          return cb(new MyError('ERROR', 'process', 'Error', {zanox_url: zanox_url, watzdprice_url: watzdprice_url, shop: shop}, err));
        }
        cb();
      });
    });
  }
}

function putProduct (urlDetails, product, callback) {
  var put_options = {
    host: urlDetails.hostname,
    port: urlDetails.port,
    path: '/updateproduct',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(product)
    }
  };

  // Set up the request
  var put_req = http.request(put_options, function(res) {
    res.setEncoding('utf8');
    var body = '';
    res.on('data', function (chunk) {
      body = body + chunk;
    });
    res.on('end', function() {
      var d = JSON.parse(body);
      callback(null, d.operation);
    });
    res.on('error', function(err) {
      callback(new MyError('ERROR', 'putProduct', 'Error', {urlDetails: urlDetails, product: product}, err));
    });
  });

  // post the data
  put_req.write(product);
  put_req.end();
}

function postShopLoadStats (urlDetails, shopLoadStats, callback) {
  var post_options = {
    host: urlDetails.hostname,
    port: urlDetails.port,
    path: '/addshoploadstats',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(shopLoadStats)
    }
  };

  // Set up the request
  var put_req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('end', function() {
      callback(null);
    });
    res.on('error', function(err) {
      callback(new MyError('ERROR', 'putProduct', 'Error', {urlDetails: urlDetails, shopLoadStats: shopLoadStats}, err));
    });
  });

  // post the data
  put_req.write(shopLoadStats);
  put_req.end();
}
