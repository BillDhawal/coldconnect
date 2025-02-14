import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

export default async function handler(req, res) {
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Safe, because it's only accessible on the server
  });
  
  console.info("resume-match API hit");

  if (req.method !== "POST") {
    console.error("Method Not Allowed");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { extractedText, jobDescription } = req.body;

    if (!extractedText || !jobDescription) {
      console.error("Missing resume text or job description");
      return res.status(400).json({ error: "Missing resume text or job description" });
    }

    console.debug("Extracted text received:", extractedText);
    console.debug("Job description received:", jobDescription);

    const prompt = `
    Evaluate how well the following resume matches the given job description.

    ### Match Score Evaluation Criteria (0-100)  
    Assign a match score based on the following parameters:  
    1. **Skills Match (30%)** - Check how many of the job description's required skills appear in the resume.  
    2. **Experience Relevance (20%)** - Evaluate if past work experience aligns with job requirements.  
    3. **Education & Certifications (10%)** - Check if required degrees or certifications are listed.  
    4. **Job Titles & Responsibilities (10%)** - Ensure job titles and responsibilities in the resume align with the job.  
    5. **Keywords & Terminology (10%)** - Check if the resume contains relevant industry keywords.  
    6. **Projects & Achievements (10%)** - Look for quantifiable achievements related to the job.  
    7. **Soft Skills (10%)** - Identify if key soft skills mentioned in the job description are present in the resume.  

    - A **match score > 75** indicates a strong match.  
    - A **match score between 50-75** suggests partial alignment.  
    - A **match score < 50** means the resume is not a good fit.  

    ---

    ### Expected JSON Output Format  

    Return ONLY valid JSON inside triple backticks: Below is the example output format.  

    \`\`\`json  
    {  
      "company": "Company name",
      "potential_domain": "company.com",
      "match_score": 85,  
      "matching_skills": ["Skill 1", "Skill 2", "Skill 3"],  
      "missing_skills": ["Skill 1", "Skill 2", "Skill 3"],  
      "feedback": "The resume is strong in technical skills but lacks experience in project management. It is ATS-friendly but could improve by adding more job-related keywords."  
    }  
    \`\`\`  
    
    Resume:
    ${extractedText}
    ----
    Job Description:
    ${jobDescription}
    `;

    console.debug("Prompt sent to OpenAI:", prompt);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const jsonResponse = response.choices[0]?.message?.content?.trim();

    if (!jsonResponse) {
      console.error("Invalid response from OpenAI");
      return res.status(500).json({ error: "Invalid response from OpenAI" });
    }

    console.debug("Response from OpenAI:", jsonResponse);

    const jsonMatch = jsonResponse.match(/```json([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : jsonResponse;

    console.info("Match result:", jsonText);

    return res.status(200).json(JSON.parse(jsonText));
  } catch (error) {
    console.error("Error processing resume match:", error);
    return res.status(500).json({ error: "Failed to evaluate resume match" });
  }
}

