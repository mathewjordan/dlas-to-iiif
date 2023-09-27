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
          manifest.addThumbnail({
            id: item.deed_img,
            type: "Image",
            format: "image/jpeg",
            width: 200,
            height: 200,
          });
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
    const painting = item.deed_img.replace("thumb", "full");
    const baseId = item.id.replace("json", "");

    manifest.addLabel(item.deed_identifier);

    if (item.deed_identifier)
      manifest.addMetadata(
        { none: ["Deed Identifier"] },
        { none: [item.deed_identifier] }
      );

    if (item.deed_county)
      manifest.addMetadata(
        { none: ["Deed County"] },
        { none: [item.deed_county] }
      );

    if (item.deed_date)
      manifest.addMetadata({ none: ["Deed Date"] }, { none: [item.deed_date] });

    if (item.document_type)
      manifest.addMetadata(
        { none: ["Document Type"] },
        { none: [item.document_type] }
      );

    manifest.createCanvas(`${baseId}/canvas/0`, (canvas) => {
      canvas.width = 1200;
      canvas.height = 1200;
      canvas.createAnnotation(`${baseId}/annotation/0`, {
        id: `${baseId}/annotation/0`,
        type: "Annotation",
        motivation: "painting",
        body: {
          id: painting,
          type: "Image",
          format: "image/jpg",
          height: 1200,
          width: 1200,
        },
      });
    });
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
