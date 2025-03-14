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
      console.warn("No domain provided for email lead generation");
      return {
        companyName: "Unknown Company",
        location: "Unknown",
        emails: [],
      };
    }

    // Clean up the domain
    domain = domain.trim().toLowerCase();

    // Remove http/https and www if present
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, "");

    // Remove any path or query parameters
    domain = domain.split("/")[0];

    console.log(`Searching for email leads for domain: ${domain}`);

    // Make a request to our API endpoint
    const response = await axios.post("/api/hunter-search", { domain });

    return {
      companyName: response.data.companyName || domain,
      location: response.data.location || "Unknown",
      emails: response.data.emails || [],
    };
  } catch (error: any) {
    console.error("Error in getCompanyData:", error);

    // Instead of throwing an error, return a default object
    // This prevents the application from crashing when Hunter API fails
    return {
      companyName: domain || "Unknown Company",
      location: "Unknown",
      emails: [],
    };
  }
}
