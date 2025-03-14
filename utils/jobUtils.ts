import axios from "axios";

interface JobData {
  jobDescription: string;
  companyName: string;
}

/**
 * Extracts job description and company name from a job posting URL
 * @param url The URL of the job posting
 * @returns An object containing the job description and company name
 */
export async function extractJobFromUrl(url: string): Promise<JobData> {
  try {
    // Validate and format the URL
    if (!url) {
      throw new Error("URL is required");
    }

    // Add https:// if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Make a request to our API endpoint
    const response = await axios.post("/api/extract-job", { url });

    return {
      jobDescription: response.data.jobDescription,
      companyName: response.data.companyName || "Unknown Company",
    };
  } catch (error: any) {
    console.error("Error in extractJobFromUrl:", error);

    // Handle API response errors
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }

    // Handle network errors
    if (error.message.includes("Network Error")) {
      throw new Error(
        "Network error. Please check your internet connection and try again."
      );
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The job posting site might be slow or blocking our request."
      );
    }

    // Fallback error
    throw new Error(error.message || "Failed to extract job description");
  }
}

/**
 * Validates if a string is a valid URL
 * @param url The URL to validate
 * @returns Boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith("http") ? url : `https://${url}`);
    return true;
  } catch (e) {
    return false;
  }
}
