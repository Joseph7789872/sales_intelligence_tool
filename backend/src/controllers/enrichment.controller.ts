import type { Request, Response, NextFunction } from 'express';
import * as enrichmentService from '../services/enrichment.service.js';

interface ApiResponse<T> {
  data: T;
  message?: string;
}

export async function saveEnrichmentConfig(
  req: Request,
  res: Response<ApiResponse<enrichmentService.EnrichmentConfigPublic>>,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider, apiKey } = req.body as { provider: string; apiKey: string };

    // Validate the API key based on provider
    let isValid = false;
    if (provider === 'clay') {
      isValid = await enrichmentService.validateClayApiKey(apiKey);
    }

    const config = await enrichmentService.saveConfig(
      req.user!.id,
      provider,
      apiKey,
      isValid,
    );

    res.status(201).json({
      data: config,
      message: isValid
        ? 'API key validated and saved'
        : 'API key saved but validation failed — please check your key',
    });
  } catch (error) {
    next(error);
  }
}

export async function listEnrichmentConfigs(
  req: Request,
  res: Response<ApiResponse<enrichmentService.EnrichmentConfigPublic[]>>,
  next: NextFunction,
): Promise<void> {
  try {
    const configs = await enrichmentService.getConfigsByUser(req.user!.id);
    res.json({ data: configs });
  } catch (error) {
    next(error);
  }
}
