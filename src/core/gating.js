import { prisma } from '../app/db.js';
import fetch from 'node-fetch';

/**
 * Validates a license key using the Polar.sh public API
 * @param {string} key 
 * @returns {Promise<{valid: boolean, message?: string}>}
 */
export async function validatePolarLicense(key) {
  const organizationId = process.env.POLAR_ORGANIZATION_ID;
  
  if (!organizationId) {
    console.warn('POLAR_ORGANIZATION_ID is not configured. License validation skipped.');
    return { valid: false, message: 'Server configuration error.' };
  }

  try {
    const response = await fetch('https://api.polar.sh/v1/customer-portal/license-keys/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        key, 
        organization_id: organizationId 
      })
    });

    if (response.status === 200) {
      const data = await response.json();
      return { valid: data.status === 'granted', message: data.status };
    }

    return { valid: false, message: 'Invalid or expired license key.' };
  } catch (error) {
    console.error('Error validating Polar license:', error);
    return { valid: false, message: 'Connection to license server failed.' };
  }
}

/**
 * Check if a repository has an active subscription or license for analysis
 * @param {Object} params
 * @param {string} params.owner
 * @param {string} params.repo
 * @param {boolean} params.isPrivate
 * @param {string} [params.licenseKey]
 */
export async function checkSubscription({ owner, repo, isPrivate, licenseKey }) {
  // 1. License Key Bypass (Highest Priority)
  if (licenseKey) {
    const validation = await validatePolarLicense(licenseKey);
    if (validation.valid) {
      return { allowed: true, tier: 'PRO_LICENSE' };
    }
  }

  // 2. Database Check (SaaS/GitHub App flow)
  if (!prisma) return { allowed: true }; // Fallback for local dev without DB

  const org = await prisma.organization.findFirst({
    where: { login: owner },
    include: { 
      workspace: { 
        include: { subscription: true } 
      } 
    }
  });

  if (!org || !org.workspace) {
    if (!isPrivate) return { allowed: true, tier: 'FREE' };
    return { 
      allowed: false, 
      reason: 'PAYWALL_REQUIRED', 
      message: `Private repositories require an active subscription or license. Get one at: https://polar.sh/${owner}` 
    };
  }

  const subscription = org.workspace.subscription;
  const isActive = subscription && subscription.status === 'active';

  if (isPrivate) {
    if (!isActive) {
      return { 
        allowed: false, 
        reason: 'PAYWALL_REQUIRED', 
        message: `Analysis for private repository ${owner}/${repo} is disabled. Please upgrade your workspace subscription or provide a license key.` 
      };
    }
    return { allowed: true, tier: 'PRO' };
  }

  return { allowed: true, tier: isActive ? 'PRO' : 'FREE' };
}
