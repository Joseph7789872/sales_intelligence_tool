import type { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service.js';
import type { User } from '../types/express.js';

interface ApiResponse<T> {
  data: T;
  message?: string;
}

export async function getCurrentUser(
  req: Request,
  res: Response<ApiResponse<User>>,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ data: req.user! });
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentUser(
  req: Request,
  res: Response<ApiResponse<User>>,
  next: NextFunction,
): Promise<void> {
  try {
    const updatedUser = await usersService.updateProfile(req.user!.id, {
      companyName: req.body.companyName,
      fullName: req.body.fullName,
    });

    res.json({
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
}
