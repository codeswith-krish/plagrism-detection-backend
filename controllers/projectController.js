import Project from '../models/project.model.js';
import { extractTextFromPPT } from '../utils/pptExtractor.js';
import { calculateSimilarityScore } from '../services/similarityService.js';

// @desc    Upload Project (PPT)
// @route   POST /api/project/upload
// @access  Private/User
export const uploadProject = async (req, res) => {
  try {
    const { title, description, semester } = req.body;

    // Checked via multer middleware in routes before arriving here
    const pptFilePath = req.file ? req.file.path : null;

    if (!pptFilePath) {
      return res.status(400).json({ message: 'Please upload a valid .ppt or .pptx file' });
    }

    // Step 2: Extract text from PPT securely
    let extractedText = '';
    try {
      extractedText = await extractTextFromPPT(pptFilePath);
      if (!extractedText || extractedText.trim() === '') {
        console.error('[projectController] Extraction resulted in empty text. Rejecting upload.');
        return res.status(400).json({
          message: 'Extraction resulted in empty text. Cannot calculate similarity.'
        });
      }
      console.log('[projectController] Extraction success!');
    } catch (parseError) {
      console.error('[projectController] Extraction failed:', parseError);
      return res.status(400).json({
        message: 'Could not extract text from the slides. The file might be corrupted or empty.'
      });
    }

    // Step 2: Fetch all previously submitted projects from the database FOR THE SAME SEMESTER
    const existingProjects = await Project.find({
      semester: semester,
      extractedText: { $exists: true, $ne: '' }
    }).select('_id extractedText');

    // Build strictly mapped structure for the similarity Python script
    const existingProjectsTextArray = existingProjects.map(proj => ({
      id: proj._id.toString(),
      text: proj.extractedText
    }));

    console.log(`[projectController] Number of projects compared: ${existingProjectsTextArray.length}`);

    // Step 3: Trigger child_process API hitting the Python engine
    const similarityResult = await calculateSimilarityScore(extractedText, existingProjectsTextArray);

    console.log(`[projectController] Similarity result: ${similarityResult.highestSimilarityPercentage}%`);

    // Default our mapped parameters returning gracefully if no prior corpus
    const similarityScore = similarityResult.highestSimilarityPercentage || 0;
    const matchedProject = similarityResult.matchedProjectId || null;

    // Step 4: Strict compliance flags - >=98 triggers 'review' / 'Potential Plagiarism' logic
    let status = 'pending';
    let plagiarismStatus = 'SAFE';

    if (similarityScore >= 98) {
      status = 'review';
      plagiarismStatus = 'EXTREME'; // 'Possible plagiarism'
    } else if (similarityScore >= 80) {
      plagiarismStatus = 'HIGH'; // 'High similarity'
    } else if (similarityScore >= 50) {
      plagiarismStatus = 'SUSPICIOUS'; // 'Suspicious'
    } else {
      plagiarismStatus = 'SAFE';
    }

    // Step 5: Save final structured metadata mapping fully integrated schemas
    const project = new Project({
      title,
      description,
      semester,
      pptFilePath,
      extractedText,
      submittedBy: req.user._id,
      similarityPercentage: similarityScore,
      matchedProject,
      status,
      plagiarismStatus
    });

    await project.save();

    res.status(201).json({
      message: 'Project uploaded fully successfully! Plagiarism Engine matched complete.',
      project,
      suspiciousFlag,
      similarityScore
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
