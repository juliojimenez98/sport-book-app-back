import { Request, Response, NextFunction } from 'express';
import { Sport } from '../models/associations';
import { notFound, badRequest } from '../middlewares/errorHandler';

// GET /sports
export const getAllSports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sports = await Sport.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: sports,
    });
  } catch (error) {
    next(error);
  }
};

// GET /sports/:id
export const getSportById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const sport = await Sport.findByPk(id);
    if (!sport) {
      throw notFound('Sport not found');
    }

    res.json({
      success: true,
      data: sport,
    });
  } catch (error) {
    next(error);
  }
};

// POST /sports
export const createSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, iconUrl } = req.body;

    // Check if sport already exists
    const existingSport = await Sport.findOne({ where: { name } });
    if (existingSport) {
      throw badRequest('Sport with this name already exists');
    }

    const sport = await Sport.create({
      name,
      description,
      iconUrl,
    });

    res.status(201).json({
      success: true,
      data: sport,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /sports/:id
export const updateSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, iconUrl, isActive } = req.body;

    const sport = await Sport.findByPk(id);
    if (!sport) {
      throw notFound('Sport not found');
    }

    await sport.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(iconUrl !== undefined && { iconUrl }),
      ...(isActive !== undefined && { isActive }),
    });

    res.json({
      success: true,
      data: sport,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /sports/:id
export const deleteSport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const sport = await Sport.findByPk(id);
    if (!sport) {
      throw notFound('Sport not found');
    }

    // Soft delete
    await sport.update({ isActive: false });

    res.json({
      success: true,
      message: 'Sport deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};
