"use client";

import React, { useState } from "react";
import { getCompanyData } from "../utils/getEmailLeads";

interface Lead {
  firstName: string;
  lastName: string;
  email: string;
}

interface CompanyData {
  companyName: string;
  location: string;
  emails: Lead[];
}

const TestForm = () => {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<CompanyData | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      const data: CompanyData = await getCompanyData(domain);
      setResult(data);
    } catch (err) {
      setError("Failed to fetch company data. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Test Form</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Domain</label>
          <input
            type="text"
            className="w-full p-2 border rounded-md"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter domain"
          />
        </div>

        {error && <div className="text-red-600">{error}</div>}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-110"
        >
          Submit
        </button>
      </form>

      {result && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Result</h2>
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Company Name</th>
                <th className="py-2 px-4 border-b">Location</th>
                <th className="py-2 px-4 border-b">Emails</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-4 border-b">{result.companyName}</td>
                <td className="py-2 px-4 border-b">{result.location}</td>
                <td className="py-2 px-4 border-b">
                  <ul>
                    {result.emails.map((email, index) => (
                      <li key={index}>
                        {email.firstName} {email.lastName} - {email.email}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TestForm;
