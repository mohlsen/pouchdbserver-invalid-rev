const PouchDB = require("pouchdb");
const rp      = require('request-promise');

const serverUrl    =  "http://127.0.0.1:3030/";
const RemotePouch  = PouchDB.defaults({prefix: serverUrl});
const pouchRequest = rp.defaults({baseUrl: serverUrl, json: true});


if (require.main === module) {
    main()
    .catch(() => {
        process.exit(-1);
    });
}


async function main() {
    const dbName = "mydb";

    let person = {
        _id:   "person_1",
        first: "Fred",
        last:  "Flintstone",
    };

    const myDb = new RemotePouch(dbName);
    // Get things started by putting a document in the db.
    await upsert(myDb, person);

    // Send a valid request to the server.
    try {
        console.log(`Sending request with valid rev ${person._rev}.`);

        await pouchRequest.post({
            uri:  `/${dbName}/_bulk_get?revs=true&latest=true`,
            body: {
                docs: [{id: person._id, rev: person._rev}]
            }
        });
        console.log("Request succeeded.");
    }
    catch (err) {
        console.log("Request failed:", err);
    }

    // Send an invalid request to the server that will cause it to crash.
    try {
        const invalidRev = getInvalidRev(person._rev);
        console.log(`Sending request with invalid rev ${invalidRev}.`);

        await pouchRequest.post({
            uri:  `/${dbName}/_bulk_get?revs=true&latest=true`,
            body: {
                docs: [{id: person._id, rev: invalidRev}]
            }
        });
        console.log("Request succeeded.");
    }
    catch (err) {
        console.log("Request failed:", err);
    }
}


async function upsert(db, doc) {
    try {
        const retrievedDoc = await db.get(doc._id);
        doc._rev = retrievedDoc._rev;
        return doc;
    }
    catch (err) {
        const putResult = await db.put(doc);
        doc._rev = putResult.rev;
        return doc;
    }
}


function getInvalidRev(rev) {
    // Create an invalid revision by incrementing the last digit.
    const lastDigit = parseInt(rev[rev.length - 1], 16);
    const newLastDigit = lastDigit === 0xf ? 0 : lastDigit + 1;
    const invalidRev = rev.slice(0, -1) + newLastDigit.toString(16);
    return invalidRev;
}
