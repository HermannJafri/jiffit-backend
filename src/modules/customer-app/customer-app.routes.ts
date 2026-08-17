import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../middleware/async';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as addresses from './customer-address.service';

export const customerAppRouter = Router();
customerAppRouter.use(authenticate(['customer']));

const addressBody = z.object({
  label: z.string().trim().max(50).optional(),
  addressLine1: z.string().trim().min(1).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  cityId: z.number().int().positive(),
  pincode: z.string().trim().min(4).max(10),
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  isDefault: z.boolean().optional(),
});

customerAppRouter.get(
  '/addresses',
  asyncRoute(async (req, res) => {
    ok(res, await addresses.listCustomerAddresses(req.auth!.id));
  }),
);
customerAppRouter.get(
  '/addresses/:id',
  asyncRoute(async (req, res) => {
    ok(res, await addresses.getCustomerAddress(req.auth!.id, Number(req.params.id)));
  }),
);
customerAppRouter.post(
  '/addresses',
  validate(addressBody),
  asyncRoute(async (req, res) => {
    ok(res, await addresses.createCustomerAddress(req.auth!.id, req.body), 'Created', 201);
  }),
);
customerAppRouter.put(
  '/addresses/:id',
  validate(addressBody.partial()),
  asyncRoute(async (req, res) => {
    ok(res, await addresses.updateCustomerAddress(req.auth!.id, Number(req.params.id), req.body));
  }),
);
customerAppRouter.delete(
  '/addresses/:id',
  asyncRoute(async (req, res) => {
    ok(res, await addresses.deleteCustomerAddress(req.auth!.id, Number(req.params.id)));
  }),
);
