import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";

function loadEnvFile(fileName: string) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const sourceUri = process.env.LOCAL_MONGODB_URI || "mongodb://127.0.0.1:27017";
const targetUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "fintrack";

if (!targetUri) {
  throw new Error("Missing MONGODB_URI for target Atlas cluster.");
}

const resolvedTargetUri = targetUri;

async function copyCollection(sourceDb: ReturnType<MongoClient["db"]>, targetDb: ReturnType<MongoClient["db"]>, name: string) {
  const sourceCollection = sourceDb.collection(name);
  const targetCollection = targetDb.collection(name);

  const docs = await sourceCollection.find({}).toArray();
  if (docs.length === 0) {
    return { name, count: 0 };
  }

  const batchSize = 500;
  for (let index = 0; index < docs.length; index += batchSize) {
    const batch = docs.slice(index, index + batchSize).map((doc) => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    }));

    await targetCollection.bulkWrite(batch, { ordered: false });
  }

  const sourceIndexes = await sourceCollection.indexes();
  for (const indexDef of sourceIndexes) {
    if (indexDef.name === "_id_") {
      continue;
    }

    const options: {
      unique?: boolean;
      sparse?: boolean;
      expireAfterSeconds?: number;
      name: string;
    } = {
      name: indexDef.name || `idx_${name}_${Object.keys(indexDef.key).join("_")}`,
    };

    if (typeof indexDef.unique === "boolean") {
      options.unique = indexDef.unique;
    }
    if (typeof indexDef.sparse === "boolean") {
      options.sparse = indexDef.sparse;
    }
    if (typeof indexDef.expireAfterSeconds === "number") {
      options.expireAfterSeconds = indexDef.expireAfterSeconds;
    }

    await targetCollection.createIndex(indexDef.key, options);
  }

  return { name, count: docs.length };
}

async function run() {
  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(resolvedTargetUri);

  await sourceClient.connect();
  await targetClient.connect();

  try {
    const sourceDb = sourceClient.db(dbName);
    const targetDb = targetClient.db(dbName);
    const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();

    if (collections.length === 0) {
      console.log(`No collections found in source database '${dbName}'.`);
      return;
    }

    const results: Array<{ name: string; count: number }> = [];
    for (const collection of collections) {
      const result = await copyCollection(sourceDb, targetDb, collection.name);
      results.push(result);
      console.log(`Migrated ${result.count} docs: ${result.name}`);
    }

    const total = results.reduce((sum, item) => sum + item.count, 0);
    console.log(`Migration complete. ${total} docs copied to '${dbName}'.`);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
