import { Response, NextFunction } from "express";
import { UserCard, AppUser } from "../models/associations";
import { AuthenticatedRequest } from "../interfaces";
import { notFound, badRequest } from "../middlewares/errorHandler";

// GET /users/me/cards
export const getMyCards = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw badRequest("User ID missing");

    const cards = await UserCard.findAll({
      where: { userId },
      order: [["isDefault", "DESC"], ["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: cards,
    });
  } catch (error) {
    next(error);
  }
};

// POST /users/me/cards
export const addCard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw badRequest("User ID missing");

    const { cardHolderName, brand, last4, expMonth, expYear, isDefault } = req.body;

    if (isDefault) {
      // Set all other cards as non-default
      await UserCard.update({ isDefault: false }, { where: { userId } });
    }

    const card = await UserCard.create({
      userId,
      cardHolderName,
      brand,
      last4,
      expMonth,
      expYear,
      isDefault: isDefault || false,
    });

    res.status(201).json({
      success: true,
      data: card,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /users/me/cards/:id
export const deleteCard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const card = await UserCard.findOne({
      where: { userCardId: id, userId },
    });

    if (!card) throw notFound("Card not found");

    await card.destroy();

    res.json({
      success: true,
      message: "Card deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
