import { validate, ValidationError } from "class-validator";
import { plainToInstance } from "class-transformer";
import { Request, Response, NextFunction } from "express";

export function validateDto(dtoClass: new () => any) {
  return async function (req: Request, res: Response, next: NextFunction) {
    console.log(req.body);
    const dtoObject = plainToInstance(dtoClass, req.body);
    if (!dtoObject) {
      return res.status(400).json({ error: "Body is null" });
    }
    const errors: ValidationError[] = await validate(dtoObject);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error: ValidationError) => Object.values(error.constraints || {}))
        .flat();
      return res.status(400).json({ errors: errorMessages });
    }

    req.body = dtoObject;
    next();
  };
}
