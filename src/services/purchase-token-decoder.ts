import { PurchaseProperties } from '../types';

const decodeToken = (token: string): PurchaseProperties | undefined => {
  if (token === undefined) {
    return undefined;
  }

  try {
    const buff = Buffer.from(token, 'base64');
    const str = buff.toString('utf8').replace(/\n/g, '');
    const tokenProperties = JSON.parse(str);
    return tokenProperties;
  } catch (error) {
    return undefined;
  }
};

export { decodeToken };
