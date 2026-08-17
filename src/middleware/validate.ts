import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export function validate(schema: ZodType, source: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(source === 'body' ? req.body : req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    if (source === 'body') {
      req.body = result.data;
    }
    next();
  };
}
