const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dsmrntz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client.db('bistro_boss').collection('user');
    const menuCollection = client.db('bistro_boss').collection('menu');
    const reviewsCollection = client.db('bistro_boss').collection('reviews');
    const cartsCollection = client.db('bistro_boss').collection('carts');


    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
      res.send({ token })
    })

    // verify middleware
    const verifyToken = (req, res, next) => {
      console.log('verify token in the middleware ', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })

    }

    // Admin  verify
    const adminVerify = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    app.get('/users', verifyToken, adminVerify, async (req, res) => {
      const user = await userCollection.find().toArray();
      res.send(user)
    })

    // user admin or not check this api
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req?.decoded?.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    });


    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existUser = await userCollection.findOne(query);
      if (existUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.delete('/users/:id', verifyToken, adminVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, adminVerify, async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.get('/menu', async (req, res) => {
      const menu = await menuCollection.find().toArray();
      res.send(menu);
    });
    app.delete('/menu/:id', verifyToken, adminVerify, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(filter);
      res.send(result);
    })
    app.post('/menu', verifyToken, adminVerify, async (req, res) => {
      const menu = req.body;
      const result = await menuCollection.insertOne(menu);
      res.send(result);
    })

    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: id };
      const result = await menuCollection.findOne(filter);
      res.send(result);
    })

    app.patch('/menu/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: id };
      const updateDoc = {
        $set: {
          name: item.name,
          price: item.price,
          recipe: item.price,
          image: item.image,
          category: item.category
        }
      }
      const result = await menuCollection.updateOne(filter, updateDoc)
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const reviews = await reviewsCollection.find().toArray();
      res.send(reviews);
    });

    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const cart = await cartsCollection.find(query).toArray();
      res.send(cart);
    })

    app.post('/carts', async (req, res) => {
      const cartItems = req.body;
      const result = await cartsCollection.insertOne(cartItems);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Bistro boss is sitting')
})
app.listen(port, () => {
  console.log(`Bistro boss running on port ${port}`)
})