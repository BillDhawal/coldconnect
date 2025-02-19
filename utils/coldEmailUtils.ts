import { useState } from "react";

export const askGPTForColdEmail = async (resumeExtractedText: string, jobDescription: string) => {
  try {
    const response = await fetch("/api/cold-email-generator", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resumeExtractedText, jobDescription }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate cold email");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating cold email:", error);
    throw error;
  }
};