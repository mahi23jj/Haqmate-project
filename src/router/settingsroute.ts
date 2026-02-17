import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { SettingsServiceImpl } from '../service/settingsservice.js';
import { requireAdmin } from '../middleware/authmiddleware.js';

const router = Router();
const settings = new SettingsServiceImpl();

// ----------------------------------------------------
// PUBLIC: GET SETTINGS
// ----------------------------------------------------
router.get('/settings/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await settings.getPublicSettings();
    return res.status(200).json({
      success: true,
      message: 'Settings fetched successfully',
      data
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// ADMIN: GET SETTINGS
// ----------------------------------------------------
router.get('/settings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await settings.getSettings();
    return res.status(200).json({
      success: true,
      message: 'Settings fetched successfully',
      data
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// ADMIN: UPDATE SETTINGS
// ----------------------------------------------------
router.put('/settings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await settings.upsertSettings(req.body);
    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

export { router as SettingsRouter };
