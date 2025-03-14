import axios from "axios";

interface Lead {
  firstName: string;
  lastName: string;
  email: string;
}

interface Leads {
  companyName: string;
  location: string;
  emails: Lead[];
}

/**
 * Gets email leads for a company domain using Hunter.io
 * @param domain The company domain to search for
 * @returns An object containing company information and email leads
 */
export async function getCompanyData(domain: string): Promise<Leads> {
  try {
    // Validate domain
    if (!domain) {
      throw new Error("Domain is required");
    }

    // Clean up the domain
    domain = domain.trim().toLowerCase();

    // Remove http/https and www if present
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, "");

    // Remove any path or query parameters
    domain = domain.split("/")[0];

    // Make a request to our API endpoint
    const response = await axios.post("/api/hunter-search", { domain });

    return {
      companyName: response.data.companyName || domain,
      location: response.data.location || "Unknown",
      emails: response.data.emails || [],
    };
  } catch (error: any) {
    console.error("Error in getCompanyData:", error);

    // Handle API response errors
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }

    // Fallback to a generic error
    throw new Error(error.message || "Failed to fetch email leads");
  }
}
