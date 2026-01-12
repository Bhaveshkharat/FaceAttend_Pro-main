import axios from "axios";
import { API_BASE_URL } from "../config";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420", // ✅ Essential for ngrok
  },
});

console.log("API Service Initialized with Base URL:", API_BASE_URL);
