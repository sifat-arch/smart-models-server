const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./smart-models-key.json");
require("dotenv").config();

const port = process.env.PORT || 3000;
const app = express();
// middlewares
app.use(cors());
app.use(express.json());

const validToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({
      message: "Unauthorized access,token not found",
    });
  }
  const token = authorization.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log(decoded);

    next();
  } catch {
    res.status(401).send({
      message: "Unauthorized access",
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.0qspeye.mongodb.net/?appName=Cluster0`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    // database and collections
    const db = client.db("smart-model-db");
    const modelsCollection = db.collection("models");
    const downloadCollection = db.collection("downloads");

    // app apis here
    // get all models
    app.get("/models", async (req, res) => {
      const cursor = modelsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // post models
    app.post("/models", async (req, res) => {
      const fromData = req.body;

      const result = await modelsCollection.insertOne(fromData);
      res.send(result);
    });

    // get single data by id
    app.get("/models/:id", validToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await modelsCollection.findOne(query);
      res.send(result);
    });
    // get single data by query email

    app.get("/my-models", validToken, async (req, res) => {
      const email = req.query.email;
      const query = {
        created_by: email,
      };

      const cursor = modelsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // download related apis
    app.post("/downloads", async (req, res) => {
      const newData = req.body;
      const postResult = await downloadCollection.insertOne(newData);
      res.send(postResult);
    });

    //put
    app.put("/downloads/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: {
          downloads: 1,
        },
      };
      const result = await modelsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/my-downloads", validToken, async (req, res) => {
      const email = req.query.email;
      const query = { downloaded_by: email };
      const result = await downloadCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/search", async (req, res) => {
      const searchText = req.query.search;
      const query = { name: { $regex: searchText, $options: "i" } };
      const cursor = modelsCollection.find(query);

      const result = await cursor.toArray();

      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to the smart models ls");
});

app.listen(port, () => {
  console.log(`server is running on the port:${port}`);
});

// pass : Ccl8W1UGviLVVZQM
// userName: smart-model-db
