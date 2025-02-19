import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "../lib/pdf-config";
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from "pdfjs-dist";

export const askGPTForResumeMatch = async (extractedText: string, jobDescription: string) => {
  try {
    const response = await fetch("/api/extract-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractedText, jobDescription }),
    });

    if (!response.ok) {
      const errorText = await response.text(); // Read error details
      throw new Error(`Failed to evaluate resume match: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

export const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDoc = await loadingTask.promise;
    let text = "";

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items
        .map((item) => {
          if ("str" in item) {
            return item.str;
          }
          return "";
        })
        .join(" ");
    }
    // console.log("Extracted text:", text);
    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};
