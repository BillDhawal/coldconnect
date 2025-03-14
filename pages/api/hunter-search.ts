import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  const apiKey = process.env.HUNTER_API_KEY;

  if (!apiKey) {
    console.error("Hunter API key is not configured");
    return res.status(500).json({
      error: "Hunter API key is not configured",
      companyName: domain,
      location: "Unknown",
      emails: [],
    });
  }

  try {
    console.log(`Searching Hunter.io for domain: ${domain}`);

    // First, try to get domain information
    const domainResponse = await axios.get(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`,
      { timeout: 10000 } // 10 second timeout
    );

    const domainData = domainResponse.data.data;
    console.log(
      `Found domain data for ${domain}: ${
        domainData?.organization || "Unknown organization"
      }`
    );

    // Then, get email leads for the domain
    const emailResponse = await axios.get(
      `https://api.hunter.io/v2/email-finder?domain=${domain}&api_key=${apiKey}&limit=5`,
      { timeout: 10000 } // 10 second timeout
    );

    const emailData = emailResponse.data.data;
    console.log(
      `Found ${emailData?.emails?.length || 0} email leads for ${domain}`
    );

    // Format the response
    const formattedResponse = {
      companyName: domainData.organization || domain,
      location: domainData.country || "Unknown",
      emails:
        emailData.emails?.map((email: any) => ({
          firstName: email.first_name || "",
          lastName: email.last_name || "",
          email: email.value || "",
        })) || [],
    };

    return res.status(200).json(formattedResponse);
  } catch (error: any) {
    console.error("Error fetching from Hunter.io:", error);

    // Check if we have a response from the API with errors
    if (error.response?.data?.errors) {
      const hunterErrors = error.response.data.errors;
      const errorMessage = `Hunter.io API error: ${hunterErrors
        .map((e: any) => e.details)
        .join(", ")}`;

      console.error(errorMessage);

      // Return a partial response with the error
      return res.status(200).json({
        error: errorMessage,
        companyName: domain,
        location: "Unknown",
        emails: [],
      });
    }

    // Handle network errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      console.error(`Request to Hunter.io timed out for domain: ${domain}`);
      return res.status(200).json({
        error: "Request to Hunter.io timed out. Please try again later.",
        companyName: domain,
        location: "Unknown",
        emails: [],
      });
    }

    // Fallback to a generic error but still return a usable response
    return res.status(200).json({
      error: error.message || "Failed to fetch email leads",
      companyName: domain,
      location: "Unknown",
      emails: [],
    });
  }
}
