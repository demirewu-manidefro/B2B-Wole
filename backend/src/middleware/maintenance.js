const db = require('../db');

/**
 * Section 5.5 Global Maintenance & Dynamic Version Control
 * Exposes a central system_settings toggle. When active, middleware immediately rejects
 * inbound non-administrative API hits with a standardized 503 Service Unavailable response.
 * Also enforces version handshake check for client app cache evictions.
 */
async function maintenanceAndVersionCheck(req, res, next) {
  try {
    // 1. Check System Settings from database
    const settingsRes = await db.query('SELECT app_version, maintenance_mode FROM system_settings WHERE id = 1;');
    if (settingsRes.rows.length === 0) {
      return next();
    }

    const { app_version: currentAppVersion, maintenance_mode: isMaintenance } = settingsRes.rows[0];

    // Check if client provided version string header
    const clientVersion = req.headers['x-app-version'] || req.query.app_version;
    if (clientVersion && clientVersion !== currentAppVersion) {
      // If version mismatch (e.g. legacy client v0.9.0 vs v1.0.0), return forced update prompt
      // We allow admin calls to pass or return informative warning
      console.warn(`📱 Legacy client build detected: ${clientVersion} (Current: ${currentAppVersion})`);
      if (req.headers['x-force-version-check'] === 'true') {
        return res.status(426).json({
          error: 'Upgrade Required',
          message: `Your frontend application build (${clientVersion}) is outdated. Please update to version ${currentAppVersion} to prevent structural client-side crashes.`,
          force_update: true,
          latest_version: currentAppVersion
        });
      }
    }

    // 2. Check Global Maintenance Switch
    if (isMaintenance || process.env.MAINTENANCE_MODE === 'true') {
      // Allow System Administrator (role === 'admin') to bypass maintenance mode
      if (req.user && req.user.role === 'admin') {
        res.setHeader('X-Platform-Status', 'MAINTENANCE_ACTIVE_ADMIN_BYPASS');
        return next();
      }

      console.warn(`🛑 Inbound non-admin API hit rejected due to active Global Maintenance Mode: ${req.method} ${req.originalUrl}`);
      return res.status(503).json({
        error: 'Service Unavailable',
        status_code: 503,
        message: 'The B2B Wholesale & Escrow Marketplace is currently undergoing scheduled production updates, data structural updates, or active security mitigations. Please try again shortly.',
        maintenance_mode: true
      });
    }

    next();
  } catch (err) {
    console.error('Maintenance middleware check error:', err.message);
    next();
  }
}

module.exports = {
  maintenanceAndVersionCheck
};
