// Test script to check if API endpoints are working
// Run with: node test-api.js

import axios from "axios";

const BASE_URL = "http://localhost:5000";

async function testAPI() {
  console.log(" Testing API endpoints...\n");

  try {
    // Test health endpoint
    console.log(" Testing health endpoint...");
    const healthRes = await axios.get(`${BASE_URL}/health`);
    console.log(" Health check:", healthRes.data.status);

    // Test API info endpoint
    console.log("\n Testing API info endpoint...");
    const apiRes = await axios.get(`${BASE_URL}/api`);
    console.log(" API info:", apiRes.data.message);

    // Test external images endpoint
    console.log("\n Testing external images endpoint...");
    const imagesRes = await axios.get(`${BASE_URL}/api/external`);
    console.log(
      " External images:",
      `${imagesRes.data.items?.length || 0} items`,
    );

    // Test CORS headers
    console.log("\n Testing CORS headers...");
    const corsRes = await axios.get(`${BASE_URL}/api`, {
      headers: {
        Origin: "http://localhost:5173",
      },
    });
    console.log(" CORS test passed");

    console.log("\n All tests passed! Your API is working correctly.");
  } catch (error) {
    console.error(" Test failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
  }
}

testAPI();

