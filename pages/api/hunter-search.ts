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
    return res.status(500).json({ error: "Hunter API key is not configured" });
  }

  try {
    // First, try to get domain information
    const domainResponse = await axios.get(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`
    );

    const domainData = domainResponse.data.data;

    // Then, get email leads for the domain
    const emailResponse = await axios.get(
      `https://api.hunter.io/v2/email-finder?domain=${domain}&api_key=${apiKey}&limit=5`
    );

    const emailData = emailResponse.data.data;

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

    // Handle specific Hunter.io API errors
    if (error.response?.data?.errors) {
      const hunterErrors = error.response.data.errors;
      return res.status(400).json({
        error: `Hunter.io API error: ${hunterErrors
          .map((e: any) => e.details)
          .join(", ")}`,
      });
    }

    // Fallback to a generic error
    return res.status(500).json({
      error: error.message || "Failed to fetch email leads",
    });
  }
}
