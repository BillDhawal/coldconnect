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
    // Validate URL format
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return res.status(400).json({
        error: "Invalid URL format. Please provide a valid job posting URL.",
      });
    }

    console.log(`Processing job extraction request for URL: ${url}`);

    try {
      const { jobDescription, companyName } = await extractJobDetails(url);

      if (!jobDescription || jobDescription.trim().length < 50) {
        console.error("Extracted job description is too short or empty");
        return res.status(400).json({
          error:
            "Could not extract a valid job description from the provided URL. The content might be behind a login wall or not accessible.",
        });
      }

      console.log(
        `Successfully extracted job description (${
          jobDescription.length
        } chars) and company: ${companyName || "Unknown"}`
      );

      return res.status(200).json({
        jobDescription: jobDescription.trim(),
        companyName: companyName?.trim() || "Unknown Company",
      });
    } catch (error) {
      console.error("Error in job extraction:", error);
      return res.status(400).json({
        error:
          "Failed to extract job description. The page might be protected or require authentication.",
      });
    }
  } catch (error) {
    console.error("Error in request handler:", error);
    return res.status(500).json({
      error: "An unexpected error occurred while processing your request.",
    });
  }
}

async function fetchWithFallback(url: string): Promise<string> {
  const commonHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Ch-Ua":
      '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Referer: "https://www.google.com",
    "X-Requested-With": "XMLHttpRequest",
  };

  // Function to check if the response is valid HTML
  const isValidHtml = (html: string) => {
    return (
      html &&
      (html.includes("</html>") ||
        html.includes("</body>") ||
        html.includes("<div") ||
        html.length > 1000)
    );
  };

  // Function to handle fetch with specific proxy
  const fetchWithProxy = async (
    proxyUrl: string,
    timeout: number,
    proxyName: string
  ) => {
    try {
      console.log(`Attempting fetch via ${proxyName} proxy: ${proxyUrl}`);
      const response = await axios.get(proxyUrl, {
        headers: commonHeaders,
        timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      if (isValidHtml(response.data)) {
        console.log(
          `${proxyName} proxy fetch successful, got ${response.data.length} bytes`
        );
        return response.data;
      }
      console.error(
        `${proxyName} proxy returned invalid HTML (${
          response.data?.length || 0
        } bytes)`
      );
      throw new Error("Invalid HTML response");
    } catch (error) {
      if (error instanceof Error) {
        console.error(`${proxyName} proxy fetch failed:`, error.message);
      } else {
        console.error(`${proxyName} proxy fetch failed:`, error);
      }
      throw error;
    }
  };

  // Try different fetch methods in sequence
  const fetchMethods = [
    // Method 1: Direct fetch with browser-like headers
    async () => {
      console.log(`Attempting direct fetch from: ${url}`);
      try {
        const response = await axios.get(url, {
          headers: {
            ...commonHeaders,
            "Sec-Fetch-Site": "same-origin",
          },
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: (status) => status < 400,
        });

        if (isValidHtml(response.data)) {
          console.log(
            `Direct fetch successful, got ${response.data.length} bytes`
          );
          return response.data;
        }
        console.error(
          `Direct fetch returned invalid HTML (${
            response.data?.length || 0
          } bytes)`
        );
        throw new Error("Invalid HTML response from direct fetch");
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Direct fetch failed:`, error.message);
        } else {
          console.error(`Direct fetch failed:`, error);
        }
        throw error;
      }
    },

    // Method 2: Fetch with corsproxy.io
    async () => {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      return await fetchWithProxy(proxyUrl, 15000, "corsproxy.io");
    },

    // Method 3: Fetch with allorigins
    async () => {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        url
      )}`;
      return await fetchWithProxy(proxyUrl, 15000, "allorigins");
    },

    // Method 4: Fetch with thingproxy
    async () => {
      const proxyUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
      return await fetchWithProxy(proxyUrl, 15000, "thingproxy");
    },

    // Method 5: Fetch with corsanywhere (may require authorization)
    async () => {
      const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
      return await fetchWithProxy(proxyUrl, 20000, "corsanywhere");
    },

    // Method 6: Fetch with a POST request to handle some anti-bot measures
    async () => {
      console.log(`Attempting POST fetch from: ${url}`);
      try {
        const response = await axios.post(
          url,
          {},
          {
            headers: {
              ...commonHeaders,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: (status) => status < 400,
          }
        );

        if (isValidHtml(response.data)) {
          console.log(
            `POST fetch successful, got ${response.data.length} bytes`
          );
          return response.data;
        }
        throw new Error("Invalid HTML response from POST fetch");
      } catch (error) {
        if (error instanceof Error) {
          console.error(`POST fetch failed:`, error.message);
        } else {
          console.error(`POST fetch failed:`, error);
        }
        throw error;
      }
    },
  ];

  // Try each fetch method in sequence
  for (const fetchMethod of fetchMethods) {
    try {
      return await fetchMethod();
    } catch {
      // Continue to next method on failure
      continue;
    }
  }

  // If all methods fail, throw a user-friendly error
  throw new Error(
    "Unable to access the job posting. The page might be protected or require authentication. Please try copying and pasting the job description manually."
  );
}

async function extractJobDetails(url: string) {
  const html = await fetchWithFallback(url);
  const $ = cheerio.load(html);

  console.log(`HTML fetched, length: ${html.length} characters`);

  // Initialize variables
  let jobDescription = "";
  let companyName = "";

  // Function to clean text
  const cleanText = (text: string) => {
    return text
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
      .replace(/&nbsp;/g, " "); // Replace HTML non-breaking spaces
  };

  // Function to validate job description
  const isValidJobDescription = (text: string) => {
    if (!text) return false;

    const cleaned = cleanText(text);
    // More lenient validation for job descriptions
    return (
      cleaned.length >= 80 && // Reduced minimum length
      cleaned.length < 50000 &&
      cleaned.split(" ").length > 15 && // Reduced minimum word count
      /[.!?]/.test(cleaned) // Contains at least one sentence ending
    );
  };

  // Log the URL domain for debugging
  const domain = new URL(url).hostname;
  console.log(`Extracting job from domain: ${domain}`);

  // Site-specific extraction logic
  if (domain.includes("linkedin.com")) {
    console.log("Detected LinkedIn URL, using LinkedIn-specific selectors");
    // LinkedIn selectors
    const linkedInSelectors = [
      ".description__text",
      ".show-more-less-html__markup",
      ".jobs-description__content",
      ".jobs-box__html-content",
      ".jobs-description",
      '[data-test-id="job-details"]',
      "#job-details",
      '[data-test-id="description"]',
      ".jobs-unified-top-card__job-insight",
      ".jobs-unified-top-card__description-container",
    ];

    for (const selector of linkedInSelectors) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using LinkedIn selector: ${selector}`
          );
          break;
        }
      }
    }

    companyName =
      $(".jobs-unified-top-card__company-name").text() ||
      $(".jobs-company__name").text() ||
      $(".topcard__org-name-link").text() ||
      $("[data-test-job-card-company-name]").text();
  } else if (domain.includes("indeed.com")) {
    console.log("Detected Indeed URL, using Indeed-specific selectors");
    // Indeed selectors
    const indeedSelectors = [
      "#jobDescriptionText",
      ".jobsearch-jobDescriptionText",
      "#job-content",
      '[data-testid="jobDescriptionText"]',
      "#jobDescription",
      ".job-desc",
      "#jobDescriptionSection",
      ".job_description",
      "#job-details",
    ];

    for (const selector of indeedSelectors) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using Indeed selector: ${selector}`
          );
          break;
        }
      }
    }

    companyName =
      $(".jobsearch-InlineCompanyRating div").first().text() ||
      $(".jobsearch-CompanyInfoContainer").text() ||
      $('[data-testid="inlineHeader-companyName"]').text() ||
      $(".jobsearch-JobInfoHeader-subtitle").text();
  } else if (domain.includes("greenhouse.io")) {
    console.log("Detected Greenhouse URL, using Greenhouse-specific selectors");
    // Greenhouse selectors
    const greenhouseSelectors = [
      "#content",
      "#gh-job-content",
      ".content",
      '[data-test="description"]',
      "#job-content",
      ".job-description",
      "#job_description",
      ".job-app-body",
    ];

    for (const selector of greenhouseSelectors) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using Greenhouse selector: ${selector}`
          );
          break;
        }
      }
    }

    companyName =
      $("title").text().split("at").pop()?.split("|")[0]?.trim() ||
      $(".company-name").text() ||
      $(".app-title").text();
  } else if (domain.includes("lever.co")) {
    console.log("Detected Lever URL, using Lever-specific selectors");
    // Lever selectors
    const leverSelectors = [
      ".posting-page",
      ".posting-category-content",
      "#job-content",
      ".section-wrapper",
      ".posting-requirements",
      ".posting-headline",
      ".posting",
    ];

    for (const selector of leverSelectors) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using Lever selector: ${selector}`
          );
          break;
        }
      }
    }

    companyName =
      $(".posting-header h2").text() ||
      $(".job-title-company").text() ||
      $(".main-header-logo img").attr("alt") ||
      $("title").text().split(" is hiring ")[0];
  } else if (domain.includes("workday.com")) {
    console.log("Detected Workday URL, using Workday-specific selectors");
    // Workday selectors
    const workdaySelectors = [
      ".job-description",
      "#job-description",
      ".job-posting-section",
      ".css-1k5wd3l",
      ".css-kyg8or",
      "[data-automation-id='jobPostingDescription']",
      "[data-automation-id='jobReqDescription']",
    ];

    for (const selector of workdaySelectors) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using Workday selector: ${selector}`
          );
          break;
        }
      }
    }

    companyName =
      $("title").text().split("-")[0]?.trim() ||
      $("[data-automation-id='jobPostingHeader']").text() ||
      $(".css-1k5wd3l h3").text();
  } else if (domain.includes("ziprecruiter.com")) {
    console.log(
      "Detected ZipRecruiter URL, using ZipRecruiter-specific selectors"
    );
    // ZipRecruiter selectors
    const zipRecruiterSelectors = [
      ".job_description",
      "#job-description",
      ".jobDescriptionSection",
      ".job-details",
      ".description",
      "#description",
    ];

    for (const selector of zipRecruiterSelectors) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using ZipRecruiter selector: ${selector}`
          );
          break;
        }
      }
    }

    companyName =
      $(".hiring_company").text() ||
      $(".company_name").text() ||
      $(".company-name").text();
  } else if (domain.includes("monster.com")) {
    console.log("Detected Monster URL, using Monster-specific selectors");
    // Monster selectors
    const monsterSelectors = [
      ".job-description",
      "#JobDescription",
      ".details-content",
      ".job-description-container",
      ".description-section",
    ];

    for (const selector of monsterSelectors) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using Monster selector: ${selector}`
          );
          break;
        }
      }
    }

    companyName =
      $(".company-name").text() ||
      $(".name").text() ||
      $(".job-company").text();
  }
  // Generic selectors as fallback
  else {
    console.log("Using generic selectors for unknown job site");
    // Try common job description selectors
    const possibleJobContainers = [
      ".job-description",
      "#job-description",
      ".description",
      ".job-details",
      '[data-testid="jobDescriptionText"]',
      "article",
      ".posting-requirements",
      ".details",
      ".job-desc",
      "#job_description",
      ".job_description",
      ".description-section",
      ".job-overview",
      ".job-content",
      "main",
      ".main-content",
      '[role="main"]',
      "#main",
      ".content-main",
      '[data-test="description"]',
      '[data-test="job-description"]',
      ".job-posting-section",
      ".job-details-content",
      ".job-posting__description",
      "#content",
      ".content",
      ".job-posting",
      ".job-post",
      ".job",
      ".careers-job-description",
      ".careers-description",
      ".job-summary",
      ".summary",
      ".job-info",
      ".job-body",
      ".job-page",
      ".job-detail",
      ".job-details-description",
    ];

    for (const selector of possibleJobContainers) {
      const element = $(selector);
      if (element.length) {
        jobDescription = cleanText(element.text());
        if (isValidJobDescription(jobDescription)) {
          console.log(
            `Found valid job description using generic selector: ${selector}`
          );
          break;
        }
      }
    }

    // If still no valid job description, try getting the largest text block
    if (!isValidJobDescription(jobDescription)) {
      console.log(
        "No job description found with specific selectors, trying to find largest text block"
      );
      let largestTextBlock = "";

      // Look for elements with substantial text
      $("div, section, article, main, p").each((_, el) => {
        const text = cleanText($(el).text());
        if (
          text.length > 100 &&
          (largestTextBlock.length === 0 ||
            (text.length > largestTextBlock.length && text.length < 20000))
        ) {
          largestTextBlock = text;
        }
      });

      if (isValidJobDescription(largestTextBlock)) {
        console.log(
          `Found valid job description in largest text block (${largestTextBlock.length} chars)`
        );
        jobDescription = largestTextBlock;
      } else if (largestTextBlock.length >= 80) {
        // If we found something substantial but it didn't pass validation, use it anyway
        console.log(
          `Using largest text block as fallback (${largestTextBlock.length} chars)`
        );
        jobDescription = largestTextBlock;
      }
    }

    // Try common company name selectors if not found yet
    if (!companyName) {
      const possibleCompanySelectors = [
        ".company-name",
        ".company",
        ".employer",
        ".organization",
        'meta[property="og:site_name"]',
        'meta[name="author"]',
        ".company-info",
        ".employer-info",
        "h1 + p",
        ".posting-company",
        'meta[property="og:title"]',
        'meta[name="title"]',
        ".job-company-name",
        '[data-test="company-name"]',
        ".job-company",
        ".employer-name",
        ".hiring-company",
        ".job-employer",
        'meta[name="twitter:site"]',
        'link[rel="publisher"]',
      ];

      for (const selector of possibleCompanySelectors) {
        const element = $(selector);
        if (element.length) {
          companyName =
            selector.startsWith("meta") || selector.startsWith("link")
              ? element.attr("content") || element.attr("href") || ""
              : element.text().trim();

          // Clean up company name from URL or other formats
          if (companyName && companyName.includes("/")) {
            companyName = companyName.split("/").pop() || companyName;
          }

          if (companyName) {
            console.log(`Found company name using selector: ${selector}`);
            break;
          }
        }
      }
    }
  }

  // Clean up the extracted text
  jobDescription = cleanText(jobDescription);
  companyName = cleanText(companyName);

  // Extract company name from URL if not found
  if (!companyName) {
    try {
      const urlObj = new URL(url);
      const hostParts = urlObj.hostname.split(".");
      if (hostParts.length > 1) {
        // Use the domain name as company name (e.g., example.com -> Example)
        companyName =
          hostParts[hostParts.length - 2].charAt(0).toUpperCase() +
          hostParts[hostParts.length - 2].slice(1);
      }
    } catch (e) {
      console.error("Failed to extract company name from URL:", e);
    }
  }

  // Final validation
  if (!isValidJobDescription(jobDescription)) {
    console.error(
      "No valid job description found. Content length:",
      jobDescription?.length || 0
    );

    // If we have some content but it's not valid, use it anyway as a last resort
    if (jobDescription && jobDescription.length >= 50) {
      console.log("Using partial job description as fallback");
      return {
        jobDescription,
        companyName: companyName || "Unknown Company",
      };
    }

    throw new Error(
      "Could not find a valid job description. The page might be protected or require authentication."
    );
  }

  return {
    jobDescription,
    companyName: companyName || "Unknown Company",
  };
}
