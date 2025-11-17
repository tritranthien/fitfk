// import { authorize } from '../config/google.js';
import { insertSteps } from '../services/fitService.js';
import Steps from '../models/stepsModel.js';
import { authorize } from '../config/google.js';

export default {
  addSteps: async (req, res) => {
    try {
      const { userId, steps: stepInput } = req.body;
      const steps = Steps.parseStepsInput(stepInput);

      // authorize dùng DB token
      await authorize(userId, async (auth) => {
        try {
          const status = await insertSteps(auth, steps);
          res.json({ success: true, status, added: steps });
        } catch (e) {
          res.status(500).json({ error: e.message });
        }
      });

    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
};
