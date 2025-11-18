// src/server.ts
import express from 'express';
import { config } from './config.js';
import { app } from './app.js';
import  admin  from 'firebase-admin';



async function main() {

// var serviceAccount = require("path/to/serviceAccountKey.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
  // start server
  const port = config.port;
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}




main().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});


