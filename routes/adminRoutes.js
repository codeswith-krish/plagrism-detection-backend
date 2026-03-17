import express from 'express';
import {
  getAdminHome,
  getRequests,
  getComparePage,
  acceptProject,
  rejectProject,
  reviewProject,
  analyzeProject,
} from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { adminOnly } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Middlewares: ALL admin routes here enforce TWO checks:
// 1. Is user logged in (valid JWT token provided)?
// 2. Is that user specifically holding the role of Admin?
router.use(protect, adminOnly);

// GET ROUTES
// @route   GET /api/admin/home
router.get('/home', getAdminHome);

// @route   GET /api/admin/requests
// Displaying pending requests mapped logically by "first come first serve"
router.get('/requests', getRequests);

// @route   GET /api/admin/compare/:projectId 
router.get('/compare/:projectId', getComparePage);

// POST ROUTES
// @route   POST /api/admin/accept-project
router.post('/accept-project/:projectId', acceptProject);

// @route   POST /api/admin/reject-project
router.post('/reject-project/:projectId', rejectProject);

// @route   POST /api/admin/review-project
router.post('/review-project/:projectId', reviewProject);

// @route   POST /api/admin/analyze/:projectId
router.post('/analyze/:projectId', analyzeProject);

export default router;
