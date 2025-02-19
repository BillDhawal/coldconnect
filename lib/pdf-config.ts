import { GlobalWorkerOptions } from "pdfjs-dist";

if (typeof window !== "undefined") {
  import("pdfjs-dist").then((pdfjsLib) => {
    GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  });
}
