import ProjectSubmission from "./form.model.js";
import FormAssignment from "./formAssignment.model.js";

// Define the associations
ProjectSubmission.hasMany(FormAssignment, {
  foreignKey: "formId",
  as: "assignments",
});

FormAssignment.belongsTo(ProjectSubmission, {
  foreignKey: "formId",
  as: "form",
});

export { ProjectSubmission, FormAssignment };
