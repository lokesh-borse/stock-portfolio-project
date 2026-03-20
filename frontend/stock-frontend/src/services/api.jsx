
import axios from "axios";

const api = axios.create({
  baseURL: "https://aistockportfolio.duckdns.org/api/"
});

export default api;
