const express = require("express");
const cors = require("cors");
const axios =require('axios');

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

app.post("/authenticate", async (req, res) => {
  const { username } = req.body;
  try {
    const r = await axios.put(
        'https://api.chatengine.io/users',
        {username: username, secret: username, fisrt_name: username},
        {headers: {"private-key": "4e46c286-d61b-4191-891c-c89bcb4c9261"}}
    );
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(e.response.status).json(e.response.data);
  }
});

app.listen(3001);