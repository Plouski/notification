// src/utils/validator.ts
import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

// Types de validation disponibles
export enum ValidationType {
    BODY = 'body',
    PARAMS = 'params',
    QUERY = 'query',
}

/**
 * Fonction de validation générique pour les requêtes
 */
export const validate = (schema: Joi.Schema, type: ValidationType = ValidationType.BODY) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const data = req[type];
        const { error } = schema.validate(data, { abortEarly: false });

        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');

            logger.warn('Validation error', {
                path: req.path,
                type,
                error: errorMessage,
            });

            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => ({
                    field: detail.context?.key,
                    message: detail.message,
                })),
            });
        }

        next();
    };
};

/**
 * Schémas de validation pour les différentes routes
 */
export const schemas = {
    // Vérification de compte
    accountVerification: Joi.object({
        userId: Joi.string().required(),
        email: Joi.string().email().required(),
        name: Joi.string().optional(),
        verificationUrl: Joi.string().uri().required(),
    }),

    // Réinitialisation de mot de passe par email
    passwordResetEmail: Joi.object({
        userId: Joi.string().required(),
        email: Joi.string().email().required(),
        name: Joi.string().optional(),
        code: Joi.string().required(),
    }),

    // Réinitialisation de mot de passe par SMS
    passwordResetSms: Joi.object({
        userId: Joi.string().required(),
        phone: Joi.string().required(),
        code: Joi.string().required(),
    }),

    // Notification push
    pushNotification: Joi.object({
        userId: Joi.string().required(),
        deviceToken: Joi.string().required(),
        title: Joi.string().required(),
        body: Joi.string().required(),
        data: Joi.object().optional(),
    }),
};

export default { validate, schemas, ValidationType };