# Overview
This sample project was created to illustrate https://github.com/pouchdb/pouchdb-server/issues/391 and collect 
information to find a solution. The script will run a series of bulk-get requests to 2 seperate CouchDB server.  
In the setup or this repo, one is a full CouchDB server and the other is a pouchdb-server (via express-pouchdb).

The script will insert a document into both databases, and update it twice so 3 revisions exist. It will then call 
the bulk-get API to both servers with a varierty of paremeters and payloads and log the HTTP results.

# Prerequisites
- Node.js installed 
  - This was tested on Node v8.11.1 but any modern version will proabbly work
- A CouchDB instance running locally on port 5984 in Admin Party mode
  - A remote CouchDB server could be running, you'll just need to modify the `couchDBServerUrl` URL in 
  [src/invalid_rev_post.js](src/invalid_rev_post.js)
  - If you do not have one running or full blown CouchDB installed, the easiest way is to use to use the CouchDB Docker image.

# Usage
1. Clone and run `npm install`.  
2. Run `npm run start-server` to start the local pouchdb-server (on port 3030)
3. Run `node ./src/invalid_rev_post.js `

# Findings
Here are the results of running the above tests, and then comparing the responses from Couch and PouchDB.

Assuming the following document exists in the databases:
```javascript
{
  "_id": "person_1_1561405566171",
  "first": "Fred",
  "last": "Flintstone",
}
```

with 3 revisions (listed in revision order here)
```javascript
[ '1-d375478a89db2d0aeaff3a1d4758a631',
  '2-4f8be83c9a33ae0440d47100c634e9ef',
  '3-5bd02053b49e0381e47baa29339d5dd2' ]
```

and we'll use a non existing (but valid pattern) revision: `9-5bd02053b49e0381e47baa29339d7aa9`.  All are referred to as 
revs 1, 2, 3, and 9 in table below.

When you make an HTTP POST to  [`/{db}/_bulk_get`](https://docs.couchdb.org/en/stable/api/database/bulk-api.html#post--db-_bulk_get)


| by _id w/                         | CouchDB                                                                                                    | PouchDB           |
| --------------------------------- |------------------------------------------------------------------------------------------------------------| ------------------|
| rev 2                             | doc for rev 2  ✅                                                                                          | doc for rev 2 ✅     |
| rev 2 w/ *latest=true*            | doc for rev 3  ✅                                                                                          | doc for rev 3 ✅    |
| rev "GARBAGE"                     | error document, containing `error: 'bad_request', reason: 'Invalid rev format'` [Example 1](#example-1) ✅ |  Empty doc array [Example 2](#example-2) ❌|
| rev "GARBAGE" w/ *latest=true*    | error document, containing `error: 'bad_request', reason: 'Invalid rev format'` [Example 1](#example-1) ✅ | Empty doc array [Example 2](#example-2) ❌|
| rev 9                             | error document, containing `error: 'not_found', reason: 'missing'` [Example 3](#example-3) ✅              | doc containing only `missing: '9'` [Example 4](#example-4) ❌|
| rev 9 w/ *latest=true*            | error document, containing `error: 'not_found', reason: 'missing'` [Example 3](#example-3) ✅              | Unhandled Exception (crash on express-pouch server) - `Error: Unable to resolve latest revision for id person_1_1561405566171, rev 9-5bd02053b49e0381e47baa29339d7aa9` 💣 |

**Observation:** The CouchDB docs for `_bulk_get` do not list the query parameter for `latest=true`. But seeing the results 
for tests in row 1 an row 2, you can see that it is in fact observed.  The `latest` parameter is documented in the [*fetch* 
Replication API](https://docs.couchdb.org/en/master/replication/protocol.html#fetch-changed-documents) which is probably used 
internally when `bulk_get` is called ([it is in PouchDB](https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-core/src/adapter.js#L420)).


# Summary
1. When a invalid revision pattern is passed to the databases, the responses differ.  CouchDB returns an error document 
   with *bad_request: Invalid rev format* as seen in [Example 1](#example-1). PouchDB on the other harnd returns no 
   documents as seen in [Example 2](#example-2).  While this is an implicipt "no documents found", it does not tell the 
   client that the revision was an invalid rev format.
2. When a valid revision pattern is passed but that revision does not exist, the responses differ.  Couch returns an error 
   document with with *not_found: missing* as seen in [Example 3](#example-3).  PouchDB on the other hand returns a 
   document with a *missing* property as seen in [Example 4](#example-4).
3. When a valid revision pattern is passed and that revision does not exist AND the *latest* query is included, CouchDB
   returns the same response that was used without the query as seen in [Example 3](#example-3) (as expected).  PouchDB
   on the other hard throws an unhaldled exception and the Node.js server process is terminated.

# Example 1

```javascript
{
    results: [ {
        id: 'person_1_1561405566171',
        docs: [
            {
                error: {
                    id: 'person_1_1561405566171',
                    rev: 'GARBAGE',
                    error: 'bad_request',
                    reason: 'Invalid rev format'
                }
            }
        ]
    } ]
}
```

# Example 2

```javascript
{
    results: [ {
        id: 'person_1_1561405566171',
        docs: [
            {}
        ]
    } ]
}
```

# Example 3

```javascript
{
    results: [ {
        id: 'person_1_1561489067363',
        docs: [
            {
                error: {
                    id: 'person_1_1561489067363',
                    rev: '9-5bd02053b49e0381e47baa29339d7aa9',
                    error: 'not_found',
                    reason: 'missing'
                }
            }
        ]
    } ]
}
```

# Example 4
```javascript
{
    results: [ {
        id: 'person_1_1561489067363',
        docs: [
            {
                missing: '9-5bd02053b49e0381e47baa29339d7aa9'
            }
        ]
    } ]
}

```


