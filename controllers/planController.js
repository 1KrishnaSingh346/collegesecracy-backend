import Plan_Schema from "../models/PlanSchema.js";

// Create Plan
export const AddPlan = async (req, res) => {
  try {
    const plan = await Plan_Schema.create(req.body);
    res.status(201).json({ message: "Plan created successfully", plan });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create plan" });
  }
};


export const GetPlan = async (req, res) => {
  try {
    const { Plantype } = req.params;
    const filter = Plantype ? { Plantype } : {};
    const plans = await Plan_Schema.find(filter);
    res.status(200).json(plans); // Send just the array of plans
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to retrieve plans" });
  }
};

// Update Plan by ID
export const UpdatePlans = async (req, res) => {
  try {
    const updatedPlan = await Plan_Schema.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedPlan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    res.status(200).json({ message: "Plan updated successfully", updatedPlan });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update plan" });
  }
};

// Delete Plan by ID
export const DeletePlan = async (req, res) => {
  try {
    const deletedPlan = await Plan_Schema.findByIdAndDelete(req.params.id);
    if (!deletedPlan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    res.status(200).json({ message: "Plan deleted successfully", deletedPlan });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to delete plan" });
  }
};
