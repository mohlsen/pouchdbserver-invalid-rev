# Overview
This sample project was created to illustrate https://github.com/pouchdb/pouchdb-server/issues/391 and collect 
information to find a solution. 

# Prerequisites
- Node.js installed 
  - This was tested on Node v8.11.1 but any modern version will proabbly work
- A CouchDB instance running locally on port 5984 in Admin Party mode
  - A remote CouchDB server could be running, you'll just need to modify the `couchDBServerUrl` URL in [src/invalid_rev_post.js](src/invalid_rev_post.js)
  - If you do not have one running or full blown CouchDB installed, the easiest way is to use to use the CouchDB Docker image.

# Usage
1. Clone and run `npm install`.  
2. Run `npm run start-server` to start the local pouchdb-server (on port 3030)
3. Run `node ./src/invalid_rev_post.js `

# Findings



