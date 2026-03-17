import express from 'express';
import {
  getUserHome,
  getSubmitPage,
  getProjectStatus,
  getTeamDetails,
  createTeam,
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middlewares: ALL user routes here enforce JWT checks
router.use(protect);

// GET ROUTES
// @route   GET /api/user/home
router.get('/home', getUserHome);

// @route   GET /api/user/submit 
router.get('/submit', getSubmitPage);

// @route   GET /api/user/status
router.get('/status', getProjectStatus);

// @route   GET /api/user/team
router.get('/team', getTeamDetails);

// POST ROUTES
// @route   POST /api/user/create-team 
router.post('/create-team', createTeam);

export default router;
