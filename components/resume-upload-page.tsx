"use client";

import React, { useState } from "react";
import {
  Upload,
  FileText,
  Linkedin,
  Briefcase,
  Link as LinkIcon,
  AlertCircle,
  Info,
  Copy,
  CheckCircle,
  RefreshCcw,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractTextFromPDF, askGPTForResumeMatch } from "../utils/resumeUtils";
import { askGPTForColdEmail } from "../utils/coldEmailUtils";
import { getCompanyData } from "../utils/getEmailLeads";

interface ExtractedData {
  company: string;
  potential_domain: string;
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  feedback: string;
}

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

interface GeneratedEmail {
  subject: string;
  body: string;
}

const ResumeUploadPage = () => {
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extractingJob, setExtractingJob] = useState(false);
  const [jobExtracted, setJobExtracted] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [parsedData, setParsedData] = useState<ExtractedData | null>(null);
  const [leads, setLeads] = useState<Leads | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files) {
      setError("No file selected");
      return;
    }

    const file = files[0];
    if (
      file &&
      (file.type === "application/pdf" || file.type === "application/msword")
    ) {
      try {
        setUploadingResume(true);
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        setResumeText(text);
        setError("");
        setSuccess("Resume uploaded successfully!");
      } catch (error) {
        console.error("Error processing file:", error);
        setError("Failed to process resume. Please try again.");
      } finally {
        setUploadingResume(false);
      }
    } else {
      setError("Please upload a PDF or DOC file");
    }
  };

  const handleExtract = async (text: string, jobDescription: string) => {
    console.log("handleExtract called with:", { text, jobDescription });
    const data: ExtractedData = await askGPTForResumeMatch(
      text,
      jobDescription
    );
    console.log("Extracted Data askGPTForResumeMatch:", data);
    setParsedData(data);
    const leads: Leads = await getCompanyData(data.potential_domain);
    console.log("Leads:", leads);
    setLeads(leads);
  };

  const handleColdEmailGeneration = async (
    text: string,
    jobDescription: string
  ) => {
    console.log("handleColdEmailGeneration called with:", {
      text,
      jobDescription,
    });
    const data: GeneratedEmail = await askGPTForColdEmail(text, jobDescription);
    console.log("Generated Email:", data);
    setGeneratedEmail(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await handleExtract(resumeText, jobDescription);

      await handleColdEmailGeneration(resumeText, jobDescription);
    } catch {
      setError("Failed to generate email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openGmail = () => {
    if (!leads || !generatedEmail) return;

    const to = leads.emails.map((email) => email.email).join(",");
    const subject = encodeURIComponent(generatedEmail.subject);
    const body = encodeURIComponent(generatedEmail.body);

    const gmailURL = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;

    window.open(gmailURL, "_blank");
  };

  const handleCopyEmail = async () => {
    if (!generatedEmail) return;

    try {
      await navigator.clipboard.writeText(
        `Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`
      );
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  const handleReset = () => {
    setJobUrl("");
    setJobDescription("");
    setJobExtracted(false);
    setGeneratedEmail(null);
    setError("");
    setSuccess("");
    setResumeText("");
    setParsedData(null);
    setLeads(null);
    setShowManualInput(false);
    setEmailCopied(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Resume Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="resume-upload"
                disabled={uploadingResume}
              />
              <label
                htmlFor="resume-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload
                  className={`h-12 w-12 mb-2 ${
                    uploadingResume
                      ? "text-blue-400 animate-pulse"
                      : "text-gray-400"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {uploadingResume
                    ? "Processing resume..."
                    : "Drop your resume here or click to browse"}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Supports PDF, DOC formats
                </span>
              </label>
              {resumeText && !uploadingResume && (
                <div className="mt-4 text-sm text-green-600 flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Resume uploaded successfully
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Job Description
              </label>
              <textarea
                className="w-full h-32 p-2 border rounded-md"
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <div>{error}</div>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-110"
          disabled={!resumeText || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-3 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Generate Email"
          )}
        </Button>
      </form>

      {/* Results Section */}
      {parsedData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Match Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold mb-2">Company Name</h3>
                <div className="text-lg font-bold text-green-600">
                  {parsedData.company}
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Potential Domain</h3>
                <div className="text-lg font-bold text-green-600">
                  {parsedData.potential_domain}
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Match Score</h3>
                <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${
                      parsedData.match_score >= 75
                        ? "bg-green-500"
                        : parsedData.match_score >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${parsedData.match_score}%` }}
                  />
                </div>
                <div className="text-right mt-1">
                  <span
                    className={`text-sm font-medium ${
                      parsedData.match_score >= 75
                        ? "text-green-600"
                        : parsedData.match_score >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {parsedData.match_score}%
                  </span>
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Matching Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {parsedData.matching_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm "
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Missing Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {parsedData.missing_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm "
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Feedback</h3>
                <div className="">{parsedData.feedback}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads Section */}
      {leads && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Leads - Hunter.io
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <td className="py-2 px-4 border-b">{leads.companyName}</td>
                  <td className="py-2 px-4 border-b">{leads.location}</td>
                  <td className="py-2 px-4 border-b">
                    <ul>
                      {leads.emails.map((email, index) => (
                        <li key={index}>
                          {email.firstName} {email.lastName} - {email.email}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Generated Email Section */}
      {generatedEmail && (
        <Card className="mt-6 bg-gray-800 text-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Generated Cold Email
              </div>
              <Button
                onClick={handleCopyEmail}
                className="text-white hover:text-gray-300 p-2"
              >
                {emailCopied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium mb-2">Subject:</h3>
                  <div className="font-medium mb-2">
                    {generatedEmail.subject}
                  </div>
                </div>
              </div>
              <div>
                <div className="whitespace-pre-wrap">{generatedEmail.body}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Email Button */}
      {generatedEmail && leads && (
        <Button
          onClick={openGmail}
          className="w-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-500 ease-in-out transform hover:-translate-y-1 hover:scale-110 mt-6"
        >
          Send Email
        </Button>
      )}

      {/* Reset Button */}
      {(parsedData || generatedEmail) && (
        <Button
          type="button"
          onClick={handleReset}
          className="mt-4 flex items-center gap-2 bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          <RefreshCcw className="h-4 w-4" />
          Start Over
        </Button>
      )}

      {/* Success Message */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800">{success}</span>
        </Alert>
      )}
    </div>
  );
};

export default ResumeUploadPage;
