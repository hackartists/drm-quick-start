#!/usr/bin/env node

(function () {
  "use strict";
  const WEBSERVER_DEFAULT_PORT = 8120;
  let port = process.env.PORT || WEBSERVER_DEFAULT_PORT;

  let secretManagement = require("./SecretManagement");
  secretManagement.tryLoadSecrets();

  let express = require("express");
  let app = express();

  // We disable etag as it causes API calls to be cached even with Cache-Control: no-cache.
  app.disable("etag");

  // At /, we serve the website folder as static resources.
  app.use(express.static(__dirname + '/Website'));

  // At /api/catalog is the catalog API that provides data for the frontend.
  let catalogApi = require("./CatalogApi");
  app.use("/api/catalog", catalogApi.createRouter());

  // At /api/authorization is the Entitlement Service.
  let entitlementService = require("./EntitlementService");
  app.use("/api/authorization", entitlementService.createRouter());

  app.post('/api/license', async (req,res) => {
    var https = require('https');
    console.log("Received request for license token");
    var r = https.request({
      host: 'license.uat.widevine.com',
      port: 443,
      path: '/cenc/getcontentkey/widevine_test',
      method: 'POST',
    }, (r) => {
      var data = [];

      r.on('data', function(chunk) {
        data.push(chunk);
      }).on('end', function() {
        console.log("Received license token")
        var buffer = Buffer.concat(data);
        console.log(buffer.toString('base64'));
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': buffer.length
        });
        res.end(buffer);
      });
    })

    let body = await readBodyAsBuffer(req)
    console.log(body.toString('base64'));
    r.write(body);
    r.end();
  })

  app.listen(port);

  console.log("The website is now available at http://localhost:" + port);
  console.log("Press Control+C to shut down the application.");
})();

async function readBodyAsBuffer(req) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0)
    req.setEncoding(null)
    req.on(
      "data",
      (chunk) => (buffer = Buffer.concat([buffer, Buffer.from(chunk)]))
    )
    req.on("end", () => resolve(buffer))
    req.on("error", reject)
  })
}
