import Joi from "joi";

function mapFieldToJoi(field) {
  let base;

  switch (field.type) {
    case "string":
      base = Joi.string();
      break;
    case "string[]":
      base = Joi.array().items(Joi.string());
      break;
    case "number":
      base = Joi.number();
      break;
    case "number[]":
      base = Joi.array().items(Joi.number());
      break;
    case "boolean":
      base = Joi.boolean();
      break;
    default:
      throw new Error(`Unsupported field type: ${field.type}`);
  }

  return field.required ? base.required() : base.optional();
}

export function buildJoiSchemaFromTemplate(template) {
  const schemaShape = {};

  for (const field of template.fields) {
    schemaShape[field.name] = mapFieldToJoi(field);
  }

  return Joi.object(schemaShape);
}

export function validateAdvancedInfo(advancedInfo, template) {
  const schema = buildJoiSchemaFromTemplate(template);
  const { error, value } = schema.validate(advancedInfo, { abortEarly: false });

  if (error) {
    const details = error.details.map((d) => d.message);
    throw new Error(`Validation failed: ${details.join(", ")}`);
  }

  return value;
}
