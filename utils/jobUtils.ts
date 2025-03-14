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
      throw new Error("Please enter a job posting URL");
    }

    // Clean up the URL
    url = url.trim();

    // Remove any trailing slashes or query parameters if they might cause issues
    if (url.includes("?")) {
      // Keep only the base URL in some cases
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);

      // For certain sites, we want to keep the query parameters
      const keepParamsSites = ["lever.co", "greenhouse.io", "workday.com"];
      if (!keepParamsSites.some((site) => urlObj.hostname.includes(site))) {
        url = url.split("?")[0];
        console.log("Removed query parameters from URL:", url);
      }
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      throw new Error(
        "Please enter a valid job posting URL (e.g., https://www.linkedin.com/jobs/view/...)"
      );
    }

    // Add https:// if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    console.log(`Sending extraction request for URL: ${url}`);

    // Make a request to our API endpoint with a longer timeout
    const response = await axios.post(
      "/api/extract-job",
      { url },
      {
        timeout: 60000, // 60 seconds timeout
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.jobDescription) {
      throw new Error(
        "No job description found. The page might be protected or require authentication. Please try copying and pasting the job description manually."
      );
    }

    if (response.data.jobDescription.length < 100) {
      console.warn(
        "The extracted job description is shorter than expected:",
        response.data.jobDescription.length
      );
      // Continue anyway, as we've relaxed the validation on the server side
    }

    console.log(
      `Successfully extracted job description (${response.data.jobDescription.length} chars)`
    );

    return {
      jobDescription: response.data.jobDescription,
      companyName: response.data.companyName || "Unknown Company",
    };
  } catch (error: any) {
    console.error("Error in extractJobFromUrl:", error);

    // Handle API response errors with specific messages
    if (error.response?.data?.error) {
      throw new Error(
        `${error.response.data.error} If this persists, please try copying and pasting the job description manually.`
      );
    }

    // Handle network errors
    if (error.message?.includes("Network Error")) {
      throw new Error(
        "Network error. Please check your internet connection and try again. If the issue persists, try copying and pasting the job description manually."
      );
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new Error(
        "The request timed out. The job posting site might be slow or blocking our request. Please try copying and pasting the job description manually."
      );
    }

    // Handle CORS errors
    if (
      error.message?.includes("CORS") ||
      error.message?.includes("cross-origin")
    ) {
      throw new Error(
        "Unable to access the job posting due to website restrictions. Please try copying and pasting the job description manually."
      );
    }

    // Handle common HTTP status errors
    if (error.response?.status === 404) {
      throw new Error(
        "The job posting could not be found. It might have been removed or the URL is incorrect. Please verify the URL or try copying and pasting the job description manually."
      );
    }

    if (error.response?.status === 403) {
      throw new Error(
        "Access to this job posting is restricted. It might require authentication or be private. Please try copying and pasting the job description manually."
      );
    }

    if (error.response?.status === 400) {
      throw new Error(
        "The job posting URL appears to be invalid or inaccessible. Please verify the URL or try copying and pasting the job description manually."
      );
    }

    if (error.response?.status === 500) {
      throw new Error(
        "The server encountered an error while processing your request. Please try again later or try copying and pasting the job description manually."
      );
    }

    // Fallback error
    throw new Error(
      error.message ||
        "Unable to extract the job description. Please try copying and pasting it manually."
    );
  }
}

/**
 * Validates if a string is a valid URL
 * @param url The URL to validate
 * @returns Boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(urlWithProtocol);

    // Check if it has a valid hostname
    const isValid = Boolean(urlObj.hostname) && urlObj.hostname.includes(".");

    // Check if it's a common job board domain
    const commonJobBoards = [
      "linkedin.com",
      "indeed.com",
      "glassdoor.com",
      "monster.com",
      "ziprecruiter.com",
      "lever.co",
      "greenhouse.io",
      "workday.com",
      "jobs.lever.co",
      "boards.greenhouse.io",
      "careers.workday.com",
      "wellfound.com",
      "angel.co",
      "careers-page.com",
      "smartrecruiters.com",
      "jobvite.com",
      "ashbyhq.com",
      "apply.workable.com",
      "jobs.ashbyhq.com",
      "app.trinethire.com",
      "recruitingapp-5128.de.umantis.com",
      "careers-page.work",
      "bamboohr.com",
      "breezy.hr",
      "hire.withgoogle.com",
      "jobs.jobvite.com",
      "paylocity.com",
      "successfactors.com",
      "taleo.net",
      "ultipro.com",
    ];

    // If it's not a common job board, warn but don't invalidate
    if (
      isValid &&
      !commonJobBoards.some((domain) => urlObj.hostname.includes(domain))
    ) {
      console.warn(
        "URL is not from a common job board, extraction might be less reliable:",
        urlObj.hostname
      );
    }

    return isValid;
  } catch (e) {
    console.error("URL validation error:", e);
    return false;
  }
}
