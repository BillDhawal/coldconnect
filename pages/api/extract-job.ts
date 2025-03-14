import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const { jobDescription, companyName } = await extractJobDetails(url);

    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({
        error:
          "Could not extract a valid job description from the provided URL",
      });
    }

    return res.status(200).json({ jobDescription, companyName });
  } catch (error: any) {
    console.error("Error extracting job details:", error);
    return res.status(500).json({
      error: error.message || "Failed to extract job description",
    });
  }
}

async function fetchWithFallback(url: string): Promise<string> {
  const commonHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    Referer: "https://www.google.com/",
  };

  console.log(`Attempting direct fetch from: ${url}`);
  try {
    // First try direct fetch
    const response = await axios.get(url, {
      headers: commonHeaders,
      timeout: 10000,
    });
    console.log("Direct fetch successful");
    return response.data;
  } catch (error) {
    console.log("Direct fetch failed, trying with CORS proxy");

    // If direct fetch fails, try with a CORS proxy
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const proxyResponse = await axios.get(proxyUrl, {
        headers: commonHeaders,
        timeout: 15000,
      });
      console.log("Proxy fetch successful");
      return proxyResponse.data;
    } catch (proxyError: any) {
      console.error("Proxy fetch also failed:", proxyError.message);
      throw new Error(`Failed to fetch job details: ${proxyError.message}`);
    }
  }
}

async function extractJobDetails(url: string) {
  const html = await fetchWithFallback(url);
  const $ = cheerio.load(html);

  // Initialize variables
  let jobDescription = "";
  let companyName = "";

  // LinkedIn selectors
  if (url.includes("linkedin.com")) {
    jobDescription =
      $(".description__text").text() ||
      $(".show-more-less-html__markup").text() ||
      $(".job-details").text();
    companyName =
      $(".topcard__org-name-link").text() ||
      $(".sub-nav-cta__optional-url").text();
  }
  // Indeed selectors
  else if (url.includes("indeed.com")) {
    jobDescription = $("#jobDescriptionText").text();
    companyName = $(".jobsearch-InlineCompanyRating-companyName").text();
  }
  // Glassdoor selectors
  else if (url.includes("glassdoor.com")) {
    jobDescription = $(".jobDescriptionContent").text();
    companyName = $(".employerName").text();
  }
  // Generic selectors as fallback
  else {
    // Try common job description selectors
    const possibleJobContainers = [
      ".job-description",
      "#job-description",
      ".description",
      ".job-details",
      '[data-testid="jobDescriptionText"]',
      ".jobsearch-jobDescriptionText",
      "article",
      ".posting-requirements",
      ".details",
    ];

    for (const selector of possibleJobContainers) {
      const element = $(selector);
      if (element.length) {
        jobDescription = element.text();
        if (jobDescription.length > 100) break;
      }
    }

    // Try common company name selectors
    const possibleCompanySelectors = [
      ".company-name",
      ".company",
      ".employer",
      ".organization",
      'meta[property="og:site_name"]',
      'meta[name="author"]',
    ];

    for (const selector of possibleCompanySelectors) {
      const element = $(selector);
      if (element.length) {
        companyName = selector.startsWith("meta")
          ? element.attr("content") || ""
          : element.text();
        if (companyName) break;
      }
    }
  }

  // Clean up the extracted text
  jobDescription = jobDescription.trim().replace(/\s+/g, " ");
  companyName = companyName.trim();

  if (!jobDescription || jobDescription.length < 50) {
    throw new Error("Could not extract job description from the provided URL");
  }

  return { jobDescription, companyName };
}
