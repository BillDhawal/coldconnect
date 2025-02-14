import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

export default async function handler(req, res) {
    const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Safe, because it's only accessible on the server
    });
  console.info("Cold Email  API hit");

  if (req.method !== "POST") {
    console.error("Method Not Allowed");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { resumeExtractedText, jobDescription } = req.body;

    if (!resumeExtractedText || !jobDescription) {
      console.error("Missing resume text or job description");
      return res.status(400).json({ error: "Missing resume text or job description" });
    }

    console.debug("Extracted text received:", resumeExtractedText);
    console.debug("Job description received:", jobDescription);

    const prompt = `
    Generate a concise and professional cold email for the following job application. The email should be personalized, highlighting the most relevant skills and projects from the provided resume that align with the job description. Keep it short and impactful.
    
    ---
    
    ### **Guidelines:**  
    - Address the hiring manager or recruiter appropriately.  
    - Start with a strong introduction mentioning the job title and company name.  
    - Highlight 2-3 key skills or projects that match the job description.  
    - Keep the email concise and to the point.  
    - End with a call to action, such as requesting a conversation or expressing interest in further discussion.  
    - Avoid generic phrases; make it feel personalized and tailored to the role.  
    - **Ensure the response is in properly formatted JSON, with escaped newline characters inside strings.**  
    
    ---
    
    ### **Inputs:**  
    **Job Description:**  
    ${jobDescription}  
    
    **Resume:**  
    ${resumeExtractedText}  
    
    ---
    
    ### **Expected JSON Output Format**  
    
    Return ONLY valid JSON inside triple backticks, properly formatted for easy parsing.  
    
    \`\`\`json
    {
      "subject": "Excited to Apply for [Job Title] at [Company Name]",
      "body": "Hello [Company Name] Team,\\n\\nI came across the [Job Title] position at [Company Name] and was excited to see how well it aligns with my experience. With a background in [relevant skill] and hands-on experience in [key project], I believe I can bring value to your team.\\n\\nIn my previous role at [Previous Company], I worked on [specific project or achievement] that directly relates to this position. My expertise in [another relevant skill] makes me confident that I can contribute effectively.\\n\\nI would love the opportunity to discuss how my skills and experience align with your needs. Please let me know a convenient time for a quick chat.\\n\\nLooking forward to your response.\\n\\nBest regards,\\n[Your Name]"
    }
    \`\`\`  
    
    ---
    **Important Notes:**  
    - **Use double quotes  for JSON keys and values.**  
    - **Escape all newline characters  inside JSON strings.**  
    - **Do not include any extra text outside the JSON block.**
    `;

    console.debug("Prompt sent to OpenAI:", prompt);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
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
    try {
        // Ensure valid JSON parsing without stripping newlines
        const parsedJson = JSON.parse(jsonText);
    
        // Return properly formatted JSON with preserved newlines
        return res.status(200).json(parsedJson);
    } catch (error) {
        console.error("Error parsing JSON:", error);
        return res.status(500).json({ error: "Invalid JSON response" });
    }
  } catch (error) {
    console.error("Error processing cold email:", error);
    return res.status(500).json({ error: "Failed to generate cold email" });
  }
}

