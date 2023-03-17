import jwt, { GetPublicKeyOrSecret, JwtPayload } from 'jsonwebtoken';
import jwksClient, { CertSigningKey, RsaSigningKey } from 'jwks-rsa';

export const decodeToken = (token: string): JwtPayload => {
  return jwt.decode(token) as JwtPayload;
};

const getSigningKeyCallback: (tenantId: string) => GetPublicKeyOrSecret = (tenantId) => {
    
  const getSigningKey: GetPublicKeyOrSecret = (header, callback) => {
      jwksClient({
          jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
      }).getSigningKey(header.kid, (err, key) => {
          const signingKey = (key as CertSigningKey).publicKey ?? (key as RsaSigningKey).rsaPublicKey;
          callback(err, signingKey);
      });
  };

  return getSigningKey;
}

export const verifyToken = async (token: string, clientId: string, tenantId: string) : Promise<{isValid: boolean, reason: string}> => {
  const validationOptions = {
    audience: clientId,
    clockTolerance: 5 // Set clock skew to 5 seconds
  }
  const promise = new Promise<{isValid: boolean, reason: string}>((resolve, reject) => {
    jwt.verify(token, getSigningKeyCallback(tenantId), validationOptions, (err, payload) => {
      resolve({isValid: err === null, reason: (err as any)?.toString()});
    });
  });
  return await promise;
}