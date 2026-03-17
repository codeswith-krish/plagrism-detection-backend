import { exec } from 'child_process';

/**
 * Invokes the Python similarity engine using child_process.exec.
 * Inputs are securely streamed via stdin rather than stdout buffer limits.
 * 
 * @param {string} newProjectText - Extracted string from the newly uploaded PPT.
 * @param {Array} existingProjectsTextArray - Array of objects tracking previous submissions.
 * @returns {Promise<Object>} containing similarityPercentage and matchedProjectId.
 */
export const calculateSimilarityScore = (newProjectText, existingProjectsTextArray) => {
  return new Promise((resolve) => {
    // Structural guard - gracefully return 0 similarity if the database has no prior accepted history
    if (!existingProjectsTextArray || existingProjectsTextArray.length === 0) {
      return resolve({ highestSimilarityPercentage: 0, matchedProjectId: null });
    }

    // Build the secure integration payload
    const inputData = JSON.stringify({
      newProjectText,
      existingProjectsTextArray
    });

    // Execute exactly as requested: child_process.exec
    // We allocate a heavily increased maxBuffer (50MB) safely mapping the large text JSON strings
    const pythonProcess = exec('python utils/similarity.py', { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {

      // Handle Python crash or executable faults smoothly without dropping Node
      if (error) {
        console.error('[SimilarityService] Python Exec Error:', error);
        console.error('[SimilarityService] Stderr trace:', stderr);
        return resolve({ highestSimilarityPercentage: 0, matchedProjectId: null });
      }

      try {
        // Parse purely structural JSON response triggered cleanly by python engine completion
        const result = JSON.parse(stdout.trim());

        if (result.error) {
          console.error('[SimilarityService] Python Internal logic error:', result.error);
          return resolve({ highestSimilarityPercentage: 0, matchedProjectId: null });
        }

        // Return exactly mapped attributes ensuring they default securely to 0/null 
        resolve({
          highestSimilarityPercentage: result.highestSimilarityPercentage || 0,
          matchedProjectId: result.matchedProjectId || null
        });

      } catch (parseError) {
        console.error('[SimilarityService] Failed to parse Python JSON stdout:', stdout);
        resolve({ highestSimilarityPercentage: 0, matchedProjectId: null });
      }
    });

    // We write our massive stringified JSON into standard-in dynamically skipping OS CLI array limits
    pythonProcess.stdin.write(inputData);
    pythonProcess.stdin.end();
  });
};
