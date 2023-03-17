type NullableString = string | undefined | null;

export interface TokenService {
  getAccessToken: (clientId: NullableString, clientSecret: NullableString, tenantId: NullableString, v2?: boolean, resourceId?: string | null) => Promise<string | null>;
}

export const createTokenService: () => TokenService = () => {

  return {
    getAccessToken: async (clientId, clientSecret, tenantId, v2 = false, resourceId = null) => {
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
  };
};
