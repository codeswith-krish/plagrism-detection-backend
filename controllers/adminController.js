import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import sendEmail from '../utils/emailService.js';
import { spawn } from 'child_process';

const extractText = (filePath) => {
  return new Promise((resolve, reject) => {
    // We execute the python script using python command, you may need python3 depending on env
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
        console.error(`Python extract error: ${errorOutput}`);
        reject(new Error(errorOutput.trim() || 'Python extraction failed'));
      } else {
        resolve(result.trim());
      }
    });
  });
};

const extractTextBatch = (filePaths) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['services/plagiarismService.py', 'extract_batch']);
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
        console.error(`Python batch extract error: ${errorOutput}`);
        reject(new Error(errorOutput.trim() || 'Python batch extraction failed'));
      } else {
        try {
          resolve(JSON.parse(result).results);
        } catch (e) {
          reject(new Error(`Failed to parse python batch output: ${result}`));
        }
      }
    });

    pythonProcess.stdin.write(JSON.stringify({ filepaths: filePaths }));
    pythonProcess.stdin.end();
  });
};

const compareTexts = (currentText, existingTexts) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', ['services/plagiarismService.py']);
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
        console.error(`Python compare error: ${errorOutput}`);
        reject(new Error(errorOutput));
      } else {
        try {
          const jsonResult = JSON.parse(result);
          if (jsonResult.error) {
            reject(new Error(jsonResult.error));
          } else {
            resolve(jsonResult);
          }
        } catch (e) {
          reject(new Error(`Failed to parse python output: ${result}`));
        }
      }
    });

    pythonProcess.stdin.write(JSON.stringify({ currentText, existingTexts }));
    pythonProcess.stdin.end();
  });
};


// @desc    Get admin home page data
// @route   GET /api/admin/home
// @access  Private/Admin
export const getAdminHome = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const pendingProjects = await Project.countDocuments({ status: 'pending' });
    const acceptedProjects = await Project.countDocuments({ status: 'accepted' });
    const rejectedProjects = await Project.countDocuments({ status: 'rejected' });
    const totalStudents = await User.countDocuments({ role: 'student' });

    res.json({
      message: 'Admin Dashboard Data',
      stats: {
        totalProjects,
        pendingProjects,
        acceptedProjects,
        rejectedProjects,
        totalStudents
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get data/page to compare a new PPT with existing approved old projects
// @route   GET /api/admin/compare/:projectId
// @access  Private/Admin
export const getComparePage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('submittedBy', 'name email semester')
      .populate({
        path: 'matchedProject',
        populate: { path: 'submittedBy', select: 'name email semester' }
      });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      project,
      message: 'Loaded successfully for comparison'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all pending requests with optional semester filter
// @route   GET /api/admin/requests
// @access  Private/Admin
export const getRequests = async (req, res) => {
  try {
    const { semester } = req.query;

    const query = { status: { $in: ['pending', 'flagged', 'review'] } };

    // Apply filter functionality
    if (semester) {
      query.semester = semester;
    }

    // Projects structured in "First Come First Serve" via createdAt ASC (1)
    const projects = await Project.find(query)
      .sort({ createdAt: 1 })
      .populate('submittedBy', 'name email semester');

    if (projects.length === 0) {
      return res.status(200).json({ message: 'No new pending requests found matching criteria.' });
    }

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept a submitted Project
// @route   POST /api/admin/accept-project/:projectId
// @access  Private/Admin
export const acceptProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('submittedBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.status = 'accepted';
    await project.save();

    // Call modular email service
    await sendEmail({
      to: project.submittedBy.email,
      subject: 'Project Acceptance Notice - Plagiarism System',
      text: `Hello ${project.submittedBy.name},\n\nWe are pleased to inform you that your graduation project titled "${project.title}" has been ACCEPTED by the Admin.\n\nBest Regards,\nAdmin Team`
    });

    res.json({ message: 'Project accepted successfully and email sent', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a submitted Project with explicit reason
// @route   POST /api/admin/reject-project/:projectId
// @access  Private/Admin
export const rejectProject = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Please provide a reason for rejecting the project.' });
    }

    const project = await Project.findById(req.params.projectId).populate('submittedBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.status = 'rejected';
    project.rejectionReason = reason;

    await project.save();

    // Send explicit rejection reasons to the User
    await sendEmail({
      to: project.submittedBy.email,
      subject: 'Project Rejection Notice - Plagiarism System',
      text: `Hello ${project.submittedBy.name},\n\nUnfortunately, your project titled "${project.title}" has been REJECTED.\n\nRejection Reason: ${reason}\n\nPlease revise your project submission based on these remarks or contact the admin panel.`
    });

    res.json({ message: 'Project rejected successfully and user notified', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a submitted Project for review
// @route   POST /api/admin/review-project/:projectId
// @access  Private/Admin
export const reviewProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('submittedBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.status = 'review';
    await project.save();

    res.json({ message: 'Project marked for review', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Analyze a PPT for plagiarism
// @route   POST /api/admin/analyze/:projectId
// @access  Private/Admin
export const analyzeProject = async (req, res) => {
  try {
    const currentProject = await Project.findById(req.params.projectId);

    if (!currentProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Skip analyzed projects if necessary, but admins might want to re-analyze.
    // Given the instructions, we can just proceed.

    // Fetch all other projects from the SAME semester (excluding itself)
    const existingProjects = await Project.find({
      semester: currentProject.semester,
      _id: { $ne: currentProject._id }
    });

    if (existingProjects.length === 0) {
      return res.status(400).json({ message: 'No data to compare' });
    }

    // Extract text from current project
    let currentText = currentProject.extractedText;
    if (!currentText || currentText.trim() === '') {
      currentText = await extractText(currentProject.pptFilePath);
      if (currentText) {
        currentProject.extractedText = currentText;
        await currentProject.save();
      }
    }

    if (!currentText) {
      return res.status(400).json({ message: 'Could not extract text from the current project PPT file.' });
    }

    // Extract text from existing projects
    const existingTexts = [];
    const filesToBatch = [];
    const idMap = new Map();

    for (const project of existingProjects) {
      if (project.extractedText && project.extractedText.trim() !== '') {
        existingTexts.push({ id: project._id.toString(), text: project.extractedText });
      } else {
        filesToBatch.push(project.pptFilePath);
        idMap.set(project.pptFilePath, project);
      }
    }

    if (filesToBatch.length > 0) {
      const batchResults = await extractTextBatch(filesToBatch);
      for (const res of batchResults) {
        if (res.text) {
          const proj = idMap.get(res.filepath);
          existingTexts.push({ id: proj._id.toString(), text: res.text });
          proj.extractedText = res.text;
          await proj.save(); // Cache the text back to DB to avoid future extractions
        }
      }
    }

    // Compare texts
    let similarityResult;
    try {
      similarityResult = await compareTexts(currentText, existingTexts);
    } catch (error) {
      return res.status(500).json({ message: 'Error running similarity engine', error: error.message });
    }

    const { highestSimilarity, matchedProjectId, copiedSentences } = similarityResult;

    // Update the project based on rules
    currentProject.analysisCompleted = true;
    currentProject.similarityPercentage = highestSimilarity;

    let matchedDetails = null;

    if (matchedProjectId) {
      currentProject.matchedProject = matchedProjectId;
      currentProject.copiedSentences = copiedSentences || [];
      const matchedInfo = await Project.findById(matchedProjectId).populate('submittedBy', 'name');
      if (matchedInfo) {
        matchedDetails = {
          projectName: matchedInfo.title,
          teamName: matchedInfo.submittedBy?.name || 'Unknown',
          semester: matchedInfo.semester
        };
      }
    }

    if (highestSimilarity >= 98) {
      if (['pending', 'flagged'].includes(currentProject.status)) currentProject.status = 'review';
      currentProject.plagiarismStatus = 'EXTREME';
    } else if (highestSimilarity >= 80) {
      currentProject.plagiarismStatus = 'HIGH';
    } else if (highestSimilarity >= 50) {
      currentProject.plagiarismStatus = 'SUSPICIOUS';
    } else {
      currentProject.plagiarismStatus = 'SAFE';
    }

    await currentProject.save();

    res.json({
      message: 'Analysis completed successfully',
      project: currentProject,
      highestSimilarity,
      matchedProjectId,
      matchedDetails,
      copiedSentences
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
