import { Request, Response, NextFunction } from 'express';
import jwt, { GetPublicKeyOrSecret, JwtPayload } from 'jsonwebtoken';
import { ServicesContainer } from './services/container';
import jwksClient, {CertSigningKey, RsaSigningKey} from 'jwks-rsa';
import { MarketplaceResource } from './types';

const getSigningKeyCallback: (jwksUri: string) => GetPublicKeyOrSecret = (jwksUri) => {
    
  const getSigningKey: GetPublicKeyOrSecret = (header, callback) => {
      jwksClient({
          jwksUri
      }).getSigningKey(header.kid, (_, key) => {
          let signingKey: string | undefined = (key as CertSigningKey).publicKey;

          if (signingKey === undefined) {
            signingKey = (key as RsaSigningKey).rsaPublicKey
          }

          callback(null, signingKey);
      });
  };

  return getSigningKey;
}

export const checkToken = (services: ServicesContainer) => (req: Request, res: Response, next: NextFunction) => {

  if (services.config.requireAuth !== true) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (authHeader === undefined) {
      return res.sendStatus(401);
  }

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return res.sendStatus(401);
  }

  const token = authHeader.split(" ")[1];
  
  const decoded = jwt.decode(token);

  if (decoded === null) {
    return res.sendStatus(401);
  }

  const tenantId = (decoded as JwtPayload).tid as (string | undefined);

  if (tenantId === undefined) {
    return res.sendStatus(403);
  }

  const validationOptions = {
    audience: MarketplaceResource,
    issuer: `https://sts.windows.net/${tenantId}/`,
    clockTolerance: 5
  };

  jwt.verify(token, getSigningKeyCallback(`https://login.microsoftonline.com/${tenantId}/discovery/keys`), validationOptions, (err, payload) => {
    if (err !== null) {
      console.log(decoded);
      return res.sendStatus(403);
    }
    next();
  })
};
