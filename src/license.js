import { PRODUCT_ID } from './config.js';

const storageKey = 'photoid-pro';

export function isPro() {
  try {
    return PRODUCT_ID !== 'TODO' && localStorage.getItem(storageKey) === PRODUCT_ID;
  } catch {
    return false;
  }
}

export async function activate(key) {
  let response;
  let result;
  try {
    response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      body: new URLSearchParams({ product_id: PRODUCT_ID, license_key: key, increment_uses_count: 'false' }),
      signal: AbortSignal.timeout(12000),
    });
    result = await response.json();
  } catch {
    throw new Error('Couldn’t reach Gumroad. Check your connection and try again.');
  }
  const purchase = result.purchase;
  if (PRODUCT_ID === 'TODO' || !response.ok || !result.success || !purchase ||
      purchase.refunded || purchase.chargebacked || purchase.disputed) {
    throw new Error(PRODUCT_ID === 'TODO'
      ? 'This key could not be verified. Live activation hasn’t been configured yet.'
      : 'This key could not be verified. Check the PhotoID license key in your Gumroad receipt.');
  }
  try {
    localStorage.setItem(storageKey, PRODUCT_ID);
    return true;
  } catch {
    return false;
  }
}
