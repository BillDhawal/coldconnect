import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const HunterAPIKey = process.env.NEXT_PUBLIC_HUNTER_API_KEY;
export const getEmailLeads = async (domain: string): Promise<any> => {
    console.info("process.env.NEXT_PUBLIC_HUNTER_API_KEY", HunterAPIKey);
  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://api.hunter.io/v2/domain-search?api_key=${HunterAPIKey}&domain=${domain}`,
    headers: {}
  };

  try {
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching email leads:', error);
    throw error;
  }
};

interface EmailInfo {
    email: string;
    firstName: string;
    lastName: string;
}

interface ExtractedData {
    companyName: string;
    location: string;
    emails: EmailInfo[];
}

function extractCompanyData(json: any): ExtractedData {
    const companyName = json.data.organization;
    const location = `${json.data.city}, ${json.data.state}, ${json.data.country}`;
    
    const emails = json.data.emails.map((email: any) => ({
        email: email.value,
        firstName: email.first_name,
        lastName: email.last_name
    }));
    
    return {
        companyName,
        location,
        emails
    };
}

export const getCompanyData = async (domain: string): Promise<ExtractedData> => {
    const emailLeads = await getEmailLeads(domain);
    return extractCompanyData(emailLeads);
};

