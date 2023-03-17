import * as jwt from './jwt';

type NullableString = string | undefined | null;

export interface TokenService {
  getAccessToken: (clientId: NullableString, clientSecret: NullableString, tenantId: NullableString, resourceId: string, v2?: boolean) => Promise<string | null>;
  validate: (token: string, clientId: string, tenantId: string) => Promise<{isValid: boolean, reason: string | null}>;
}

export const createTokenService: () => TokenService = () => {

  return {
    getAccessToken: async (clientId, clientSecret, tenantId, resourceId, v2 = false) => {
        if (clientId === undefined || clientId === null || clientSecret === undefined || clientSecret === null || tenantId === undefined || tenantId === null) {
            return null;
          }
        
          const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/${v2 ? `v2.0/` : ''}token`, {
              method: 'POST',
              body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials${resourceId === null ? '' : `&resource=${resourceId}`}`,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
          });
        
          if (!response.ok) {
            return null;
          }
        
          const result = await response.json();
          return result.access_token as string;
    },

    validate: async (token, clientId, tenantId) => {
        if (token === undefined || token === null) {
            return {isValid: false, reason: "No token"};
        }

        try {
            const decoded = jwt.decodeToken(token);

            if (!Object.prototype.hasOwnProperty.call(decoded, "tid")) {
                return {isValid: false, reason: "No tenant id found in token"};
            }

            return await jwt.verifyToken(token, clientId, tenantId);
        }
        catch (e) {
            return {isValid: false, reason: (e as string)?.toString()};
        }
    }
  };
};
