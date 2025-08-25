import axios from "axios";
import { API_URL } from "../const/api";
import type { GetScannerResultParams, ScannerApiResponse } from "./types";

export async function fetchScanner(params: GetScannerResultParams): Promise<ScannerApiResponse> {
  const response = await axios.get(`${API_URL}/scanner`, {
    params,
  });
  return response.data;
}
