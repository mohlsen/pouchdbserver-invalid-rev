const PouchDB = require("pouchdb");
const rp      = require('request-promise');

const couchDBServerUrl    =  "http://127.0.0.1:5984/";
const pouchDBServerUrl    =  "http://127.0.0.1:3030/";

const RemoteCouch  = PouchDB.defaults({prefix: couchDBServerUrl});
const RemotePouch  = PouchDB.defaults({prefix: pouchDBServerUrl});

const couchRequest = rp.defaults({baseUrl: couchDBServerUrl, json: true});
const pouchRequest = rp.defaults({baseUrl: pouchDBServerUrl, json: true});

const dbName = "mydb";

if (require.main === module) {
    main()
    .catch(() => {
        process.exit(-1);
    });
}

async function main() {
    
    const person = {
        _id:   `person_1_${Date.now().toString()}`,
        first: "Fred",
        last:  "Flintstone",
        age:   "v1"
    };

    let couchRevs = [];
    let pouchRevs = [];

    const myCouchDb = new RemoteCouch(dbName);
    const myPouchDb = new RemotePouch(dbName);

    // Get things started by putting a document in the db.
    couchRevs[0] = await upsert(myCouchDb, person);
    pouchRevs[0] = await upsert(myPouchDb, person);

    // //now mofify the doc and update
    person.age = "v2";
    couchRevs[1] = await upsert(myCouchDb, person, couchRevs[0]);
    pouchRevs[1] = await upsert(myPouchDb, person, pouchRevs[0]);

    // //now mofify the doc and update
    person.age = "v3";
    couchRevs[2] = await upsert(myCouchDb, person, couchRevs[1]);
    pouchRevs[2] = await upsert(myPouchDb, person, pouchRevs[1]);

    // console.dir(couchRevs, {depth: null, colors: true})
    // console.dir(pouchRevs, {depth: null, colors: true})

    //get the doc by ID and revision 2 (latest=false)
    console.log(`COUCH: w/ revision 2 ${couchRevs[1]}, w/o latest=true`);
    await getDoc(couchRequest, person, couchRevs[1], false);
    console.log(`POUCH: w/ revision 2 ${pouchRevs[1]}, w/o latest=true`);
    await getDoc(pouchRequest, person, pouchRevs[1], false);

    //get the doc by ID and revision 2 (latest=true)
    console.log(`COUCH: w/ revision 2 ${pouchRevs[1]}, w/ latest=true`);
    await getDoc(couchRequest, person, couchRevs[1], true);
    console.log(`POUCH: w/ revision 2 ${pouchRevs[1]}, w/ latest=true`);
    await getDoc(pouchRequest, person, pouchRevs[1], true);

    //get the doc by ID and bad revision without latest=true 
    console.log(`COUCH: w/ revision GARBAGE, w/o latest=true`);
    await getDoc(couchRequest, person, 'GARBAGE', false);
    console.log(`POUCH: w/ revision GARBAGE, w/o latest=true`);
    await getDoc(pouchRequest, person, 'GARBAGE', false);

    //get the doc by ID and bad revision with latest=true 
    console.log(`COUCH: w/ revision GARBAGE, w/ latest=true`);
    await getDoc(couchRequest, person, 'GARBAGE', true);
    console.log(`POUCH: w/ revision GARBAGE, w/ latest=true`);
    await getDoc(pouchRequest, person, 'GARBAGE', true);

    const nonExisting = getInvalidRev(couchRevs[0]);

    //get the doc by ID and non-existing revision with latest=true 
    console.log(`COUCH: w/ revision non-existing, w/ latest=false`);
    await getDoc(couchRequest, person, nonExisting, false);
    console.log(`POUCH: w/ revision non-existing, w/ latest=false`);
    await getDoc(pouchRequest, person, nonExisting, false);

    //get the doc by ID and non-existing revision with latest=true 
    console.log(`COUCH: w/ revision non-existing, w/ latest=true`);
    await getDoc(couchRequest, person, nonExisting, true);
    console.log(`POUCH: w/ revision non-existing, w/ latest=true`);
    await getDoc(pouchRequest, person, nonExisting, true);
 }


async function upsert(db, doc, rev) {

    const newDoc = Object.assign(doc, {_rev: rev});

    try {
        const putResult = await db.put(newDoc);
        return putResult.rev;
    }
    catch (err) {
        console.log(err);
    }
}

async function getDoc(request, doc, rev, latest) {

    docToRequest = {id: doc._id};
    
    //add the rev version to teh doc if we need to
    if (rev) {
        docToRequest.rev = rev;
    }

    try {
        const result = await request.post({
            uri:  `/${dbName}/_bulk_get${latest? '?latest=true':''}`,
            body: {
                docs: [docToRequest]
            }
        });

        console.dir(result, {depth: null, colors: true})
    }
    catch (err) {
        console.log("Request failed:", err);
    }

}


function getInvalidRev(rev) {
    // Create an invalid revision by incrementing the last digit.
    const lastDigit = parseInt(rev[rev.length - 1], 16);
    const newLastDigit = lastDigit === 0xf ? 0 : lastDigit + 1;
    const invalidRev = rev.slice(0, -1) + newLastDigit.toString(16);
    return invalidRev;
}
