import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY not found in .env");
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function testGemini() {
  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [
          {
            parts: [{ text: "Say hello in Spanish." }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const output = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Gemini Response:", output);
  } catch (error) {
    console.error("Error testing Gemini API:", error.response?.data || error.message);
  }
}

testGemini();
