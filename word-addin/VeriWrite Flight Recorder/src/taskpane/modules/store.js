// Handles Settings and CustomXmlParts in Word Document

import { generateUUID, b64Encoder, b64Decoder } from "./utils.js";


let xmlId = null;

/** Saves flightRecord.json at Word's CustomXmlPart Interface
 * 
 * @param {object} record - The flightRecord file
 * @returns {string} xmlId
 */
export async function saveCustomXml(record) {
  const json = JSON.stringify(record);
  const b64 = b64Encoder(json);   // Encode with base64
  const xml = `<vw xmlns="urn:veriwrite:v2"><b64>${b64}</b64></vw>`;
  try {
    return await(Word.run(async (context) => {
      const settings = context.document.settings;
      await context.sync();
      
      // Replace original xml part
      const existingId = settings.getItemOrNullObject('xmlId');  // item
      existingId.load("value");
      await context.sync();
      if (!existingId.isNullObject) {
        context.document.customXmlParts.getItemOrNullObject(existingId.value).delete();
      }

      const recordXml = context.document.customXmlParts.add(xml);
      recordXml.load("id");
      await context.sync();
      settings.add("xmlId", recordXml.id);
      await context.sync();

      return recordXml.id;    // xmlId
    }))
  } catch(err) {
    console.log("Error saving custom xml: ", err)
    throw err;
  }
}

// Load Settings: m.docId, v, xmlId (returns all in order)
export async function loadSettings() {
  try {
    return await Word.run(async (context) => {
      const settings = context.document.settings;
      await context.sync()
      const docIdItem = settings.getItemOrNullObject('docId');
      const schemaItem = settings.getItemOrNullObject('v');
      const xmlIdItem = settings.getItemOrNullObject('xmlId');

      // Load Items
      docIdItem.load("value");
      schemaItem.load("value");
      xmlIdItem.load("value");
      
      await context.sync();

      const docId = docIdItem.isNullObject ? null : docIdItem.value;
      const schema = schemaItem.isNullObject ? null : schemaItem.value;
      const xmlId = xmlIdItem.isNullObject ? null : xmlIdItem.value;

      return [docId, schema, xmlId];
    })
  } catch(err) {
    console.log(`Error loading settings: ${err}`);
  }
}

// Update Settings: updates m.docId, v, or xmlId
export async function updateSettings(key, value) {
  try {
    await Word.run(async (context) => {
      const settings = context.document.settings;
      await context.sync();

      const item = settings.getItemOrNullObject(key);
      item.load("value");
      await context.sync();

      if (item.isNullObject) {
        settings.add(key, value);
      } else {
        item.value = value;
      }

      await context.sync();
    })
  } catch(err) {
    console.log(`Error updating settings: ${err}`);
  }
}

// Load flightRecord from XML
export async function loadRecord(xmlId) {
  try {
    return await Word.run(async (context) => {
      if (!xmlId) return;

      // Extract XML
      const xmlPart = context.document.customXmlParts.getItemOrNullObject(xmlId);
      xmlPart.load("xml");
      const xml = xmlPart.getXml();
      await context.sync();

      // Parse XML
      const xmlStr = xml.value;
      const xmlDoc = new DOMParser().parseFromString(xmlStr, "text/xml");
      const b64 = xmlDoc.getElementsByTagName("b64")[0].textContent;
      const json = b64Decoder(b64);
      const flightRecord = JSON.parse(json);
      return flightRecord;
    })
  } catch(err) {
    console.log(`Error loading record: ${err}`);
  }
}