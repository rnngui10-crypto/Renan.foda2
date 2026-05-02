import { Router, type IRouter } from "express";
import healthRouter from "./health";
import iqoptionRouter from "./iqoption";

const router: IRouter = Router();

router.use(healthRouter);
router.use(iqoptionRouter);

export default router;
