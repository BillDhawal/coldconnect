import { useState } from "react";

export const askGPTForColdEmail = async (resumeExtractedText, jobDescription) => {
  try {
    const response = await fetch("/api/cold-email-generator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeExtractedText, jobDescription }),
    });

    if (!response.ok) {
      const errorText = await response.text(); // Read error details
      throw new Error(`Failed to generate cold email: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};