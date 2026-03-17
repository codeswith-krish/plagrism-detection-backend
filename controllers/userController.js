import Project from '../models/project.model.js';
import Team from '../models/team.model.js';
import User from '../models/user.model.js';

// @desc    Get user home page data
// @route   GET /api/user/home
// @access  Private/User
export const getUserHome = async (req, res) => {
  try {
    // Send dashboard statistics for the logged in user
    const userProjects = await Project.countDocuments({ submittedBy: req.user._id });
    const userTeams = await Team.countDocuments({
      $or: [
        { leader: req.user._id },
        { members: req.user._id }
      ]
    });

    res.json({
      message: `Welcome to your Dashboard, ${req.user.name}`,
      stats: { projects: userProjects, teams: userTeams }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get submit page details
// @route   GET /api/user/submit
// @access  Private/User
export const getSubmitPage = async (req, res) => {
  try {
    res.json({ message: 'Render project submission form logic' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get the status of user's submitted project
// @route   GET /api/user/status
// @access  Private/User
export const getProjectStatus = async (req, res) => {
  try {
    // Find projects submitted by the currently logged in user
    const projects = await Project.find({ submittedBy: req.user._id })
      .select('title description status similarityPercentage submittedAt')
      .sort({ submittedAt: -1 }); // Newest first

    if (!projects || projects.length === 0) {
      return res.status(404).json({ message: 'No projects submitted yet' });
    }
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's team details
// @route   GET /api/user/team
// @access  Private/User
export const getTeamDetails = async (req, res) => {
  try {
    // Find all teams where the user is a leader or a member
    const teams = await Team.find({
      $or: [
        { leader: req.user._id },
        { members: req.user._id }
      ]
    })
      .populate('leader', 'name email semester')
      .populate('members', 'name email semester') // Get member details
      .populate('project', 'title status description similarityPercentage submittedAt');       // Get project details

    if (!teams || teams.length === 0) {
      return res.status(404).json({ message: 'You are not part of any team yet' });
    }

    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new team
// @route   POST /api/user/create-team
// @access  Private/User
export const createTeam = async (req, res) => {
  try {
    const { teamName, memberIds, projectId } = req.body;

    const leaderId = req.user._id.toString();

    // Default members array containing only the leader initially
    let membersArray = [leaderId];

    // If additional memberIds (which can be emails or string IDs) are provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const validQueryIds = [];
      const emailsQuery = [];

      memberIds.forEach(id => {
        const cleanId = id.trim();
        if (cleanId.includes('@')) {
          emailsQuery.push(cleanId.toLowerCase());
        } else if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
          // If a standard 24 hex char Mongo ID 
          validQueryIds.push(cleanId);
        } else {
          // Keep track of completely invalid identifiers
          emailsQuery.push(cleanId);
        }
      });

      // Find these members inside our DB 
      const queryOr = [];
      if (validQueryIds.length > 0) queryOr.push({ _id: { $in: validQueryIds } });
      if (emailsQuery.length > 0) queryOr.push({ email: { $in: emailsQuery } });

      let identifiedMembers = [];

      if (queryOr.length > 0) {
        const foundUsers = await User.find({ $or: queryOr }).select('_id');
        identifiedMembers = foundUsers.map(u => u._id.toString());
      }

      if (identifiedMembers.length !== memberIds.length) {
        return res.status(400).json({ message: 'One or more user IDs or emails provided could not be found.' });
      }

      membersArray = [...membersArray, ...identifiedMembers];
    }

    // Prevent duplicate members (including duplicate leader)
    const uniqueMembers = [...new Set(membersArray)];

    // Validation: A user can only be part of ONE active team
    // Check if any of these unique users already exist in another team
    const existingTeam = await Team.findOne({ members: { $in: uniqueMembers } });
    if (existingTeam) {
      return res.status(400).json({
        message: 'One or more users are already part of an existing team.'
      });
    }

    // Validate that project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create the team
    const team = new Team({
      teamName,
      leader: leaderId,
      members: uniqueMembers,
      project: projectId
    });

    await team.save();
    res.status(201).json({ message: 'Team created successfully', team });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
