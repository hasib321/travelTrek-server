const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//MIDDLEWARE
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vgwhtfa.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const tourPlanCollection = client
      .db("travelTrekDB")
      .collection("tourPackage");

    const tourTypeCollection = client.db("travelTrekDB").collection("tourType");
    const storyCollection = client.db("travelTrekDB").collection("story");

    const guideProfileCollection = client
      .db("travelTrekDB")
      .collection("guideProfile");

    const bookingPackageCollection = client
      .db("travelTrekDB")
      .collection("bookingPackage");

    const wishlistCollection = client.db("travelTrekDB").collection("wishlist");
    const touristCollection = client
      .db("travelTrekDB")
      .collection("touristCollection");

    //JWT RELATED API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    //Middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await touristCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // use verify TourGuide after verifyToken
    const verifyTourGuide = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await touristCollection.findOne(query);
      const isTourGuide = user?.role === "tourGuide";
      if (!isTourGuide) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //Tourist collection related api
    app.get("/tourist/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await touristCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/tourist/tourGuide/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await touristCollection.findOne(query);
      let tourGuide = false;
      if (user) {
        tourGuide = user?.role === "tourGuide";
      }
      res.send({ tourGuide });
    });

    app.patch(
      "/tourist/admin/:id",
      verifyToken,
      verifyAdmin,

      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await touristCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.patch(
      "/tourist/tourGuide/:id",
      verifyToken,
      verifyTourGuide,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "tourGuide",
          },
        };
        const result = await touristCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.get(
      "/tourist",
      verifyToken,
      verifyAdmin,

      async (req, res) => {
        const cursor = touristCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      }
    );

    app.post("/tourist", async (req, res) => {
      const tourist = req.body;

      const query = { email: tourist.email };
      const existingUser = await touristCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await touristCollection.insertOne(tourist);
      res.send(result);
    });

    //STORY RELATED API
    app.get("/story/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await storyCollection.findOne(query);
      res.send(result);
    });

    app.post("/stories", async (req, res) => {
      const stories = req.body;
      const result = await storyCollection.insertOne(stories);
      res.send(result);
    });

    app.get("/stories", async (req, res) => {
      const cursor = storyCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //for get all tour Package
    app.post("/packages", verifyToken, verifyAdmin, async (req, res) => {
      const packages = req.body;
      const result = await tourPlanCollection.insertOne(packages);
      res.send(result);
    });

    app.get("/packages", async (req, res) => {
      const cursor = tourPlanCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //for specific tour type
    app.get("/packages/:tourType", async (req, res) => {
      const cursor = tourPlanCollection.find({
        tourType: req.params.tourType,
      });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/package/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tourPlanCollection.findOne(query);
      res.send(result);
    });

    //for get all tour types
    app.get("/tourType", async (req, res) => {
      const cursor = tourTypeCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //for get all tour guide profile
    app.post("/guideProfile", async (req, res) => {
      const guides = req.body;
      const result = await guideProfileCollection.insertOne(guides);
      res.send(result);
    });

    app.get("/guideProfile", async (req, res) => {
      const cursor = guideProfileCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/guideProfileDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await guideProfileCollection.findOne(query);
      res.send(result);
    });

    //WISHLIST RELATED API
    app.get("/wishlistDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    });
    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/wishlist", async (req, res) => {
      const email = req.query.touristEmail;
      const query = { touristEmail: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const wishlist = req.body;
      const result = await wishlistCollection.insertOne(wishlist);
      res.send(result);
    });

    //BOOKING package RELATED API

    app.get("/bookings", async (req, res) => {
      const email = req.query.touristEmail;
      const query = { touristEmail: email };
      const result = await bookingPackageCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingPackageCollection.insertOne(booking);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("TravelTrek server is running");
});
app.listen(port, () => {
  console.log(`TravelTrek server is running on port ${port}`);
});
