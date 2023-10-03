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

  console.log(`Created collection/deeds.json`);

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

    if (item.book)
      manifest.addMetadata({ none: ["Book"] }, { none: [item.book] });

    if (item.deed_notes)
      manifest.addMetadata({ none: ["Notes"] }, { none: [item.deed_notes] });

    const grantors = item?.people
      .filter((person) => person.role === "grantor")
      .map((person) => buildName(person));

    const grantees = item?.people
      .filter((person) => person.role === "grantee")
      .map((person) => buildName(person));

    const enslaved = item?.people
      .filter((person) => person.role === "enslaved")
      .map((person) => buildName(person, true));

    if (grantors.length > 0) {
      manifest.addMetadata({ none: ["Grantors"] }, { none: grantors });
    }

    if (grantees.length > 0) {
      manifest.addMetadata({ none: ["Grantees"] }, { none: grantees });
    }

    if (enslaved.length > 0) {
      manifest.addMetadata(
        { none: ["Enslaved"] },
        {
          none: enslaved,
        }
      );
    }

    // define paragraph style description for the deed that includes all metadata and people along with their roles. the paragraph should describe the sale of people from grantors to grantees and include the names of the enslaved people.
    const description = `The ${item.document_type} was recorded in ${
      item.deed_county
    } County, North Carolina on ${
      item.deed_date
    }. ${grantors.join()} sold the enslaved person(s) ${enslaved.join()} to ${grantees.join()}.`;

    manifest.addSummary(description);

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

  console.log(`Created manifest/${item.filename}`);

  return;
}

function buildName(person, includeDetails = false) {
  let name = "";

  if (person.first_name) name += person.first_name;
  if (person.middle_name) name += ` ${person.middle_name}`;
  if (person.last_name) name += ` ${person.last_name}`;

  if (includeDetails) {
    if (person.color_race) name += ` - ${person.color_race}`;
    if (person.sex) name += ` - ${person.sex}`;
    if (person.age) name += ` - ${person.age}`;
  }

  return name;
}
