import { Router } from "express";
import { getMyCards, addCard, deleteCard } from "../controllers/card.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.use(authenticate);

router.get("/me", getMyCards);
router.post("/me", addCard);
router.delete("/me/:id", deleteCard);

export default router;
