import { spawn } from 'child_process';

/**
 * Extracts raw textual data securely from an uploaded .ppt or .pptx file
 * Parses content across all slides, and comprehensively strips extra whitespace
 * 
 * @param {string} filePath - Path to the locally stored file
 * @returns {Promise<string>} - Extracted, cleanly formatted text
 */
export const extractTextFromPPT = (filePath) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['services/plagiarismService.py', 'extract', filePath]);
    let result = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[pptExtractor] Python execution error: ${errorOutput}`);
        reject(new Error(errorOutput.trim() || 'Internal server error during text extraction'));
      } else {
        const cleanedText = result.replace(/\s+/g, ' ').trim();
        resolve(cleanedText);
      }
    });
  });
};
