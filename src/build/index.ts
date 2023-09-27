require("dotenv").config();

const fs = require("fs");
const { IIIFBuilder } = require("iiif-builder");
const slugify = require("slugify");

// set constants
const path = "data/buncombe-county-slave-deeds--test.json";
const dir = "dist/api";
const apiUrl = `${process.env.DLAS_URL}/api`;

// get data
const data = fs.readFileSync(path, {});
const json = JSON.parse(data);

// create output directories
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
if (!fs.existsSync(`${dir}/collection`)) fs.mkdirSync(`${dir}/collection`);
if (!fs.existsSync(`${dir}/manifest`)) fs.mkdirSync(`${dir}/manifest`);

// create data with manifest listing
const listing = json.map((item) => {
  const string = item.deed_identifier.replace(/[.()'"!:@]/g, "-").toLowerCase();
  const id = slugify(string);
  const filename = `${id}.json`;
  return {
    filename,
    id: `${apiUrl}/manifest/${filename}`,
    ...item,
  };
});

// create iiif collection for slave deeds
createCollection(listing, {
  label: "Buncombe County Slave Deeds",
});

// create iiif manifest for each slave deed
listing.forEach((item) => createManifest(item));

// generate a iiif collection
function createCollection(items, options) {
  const builder = new IIIFBuilder();
  const collectionNormalized = builder.createCollection(
    `${apiUrl}/collection/deeds.json`,
    (collection) => {
      collection.addLabel(options?.label);
      items.forEach((item) => {
        collection.createManifest(item.id, (manifest) => {
          manifest.addLabel(item.deed_identifier);
        });
      });
    }
  );

  const collection = builder.toPresentation3({
    id: collectionNormalized.id,
    type: "Collection",
  });

  fs.writeFileSync(`${dir}/collection/deeds.json`, JSON.stringify(collection));

  return;
}

// generate a iiif manifest
function createManifest(item) {
  const builder = new IIIFBuilder();
  const manifestNormalized = builder.createManifest(item.id, (manifest) => {
    manifest.addLabel(item.deed_identifier);
  });

  const manifest = builder.toPresentation3({
    id: manifestNormalized.id,
    type: "Manifest",
  });

  fs.writeFileSync(
    `${dir}/manifest/${item.filename}`,
    JSON.stringify(manifest)
  );
}
