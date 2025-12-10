/**
 * asset-utils.js
 * 
 * Utility functions for Excel file parsing, data extraction,
 * transformation, and validation for the Assets module.
 */

// ============================================
// VALIDATION
// ============================================

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message, asset) {
    super(message);
    this.name = 'ValidationError';
    this.asset = asset;
  }
}

/**
 * Validate individual asset record
 * @param {Object} asset - Asset object to validate
 * @returns {Object} Validated asset
 * @throws {ValidationError} If validation fails
 */
export function validateAsset(asset) {
  const errors = [];

  // Required fields
  if (!asset.id) errors.push('Asset ID (Anlage) is required');
  if (!asset.name) errors.push('Asset name is required');
  if (!asset.status) errors.push('Status is required');

  // Status enum validation
  const validStatuses = ['IN BETRIEB', 'AKTIV', 'INAKTIV', 'STILLGELEGT'];
  if (asset.status && !validStatuses.includes(asset.status)) {
    errors.push(`Invalid status: ${asset.status}`);
  }

  // Type inference from name if not provided
  if (!asset.type) {
    asset.type = inferAssetType(asset.name || '');
  }

  // Name length validation
  if (asset.name && asset.name.length > 100) {
    errors.push('Asset name must not exceed 100 characters');
  }

  // Description length validation
  if (asset.description && asset.description.length > 500) {
    errors.push('Asset description must not exceed 500 characters');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '), asset);
  }

  return asset;
}

/**
 * Infer asset type from name
 * @param {string} name - Asset name
 * @returns {string} Inferred type
 */
export function inferAssetType(name) {
  const typePatterns = {
    'LVUM': /LVUM|LV-UM|LV-EN/i,
    'UV': /UV-|KRAFT|UNTERVERTEILER/i,
    'KV': /KV-|KV_/i,
    'LV': /LV-/i,
  };

  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(name)) return type;
  }
  return 'OTHER';
}

/**
 * Validate asset data for form submission
 * @param {Object} data - Asset form data
 * @returns {Object} Validation result {isValid, errors}
 */
export function validateAssetForm(data) {
  const errors = {};

  // Name is required
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Name ist erforderlich';
  } else if (data.name.length > 100) {
    errors.name = 'Name darf maximal 100 Zeichen haben';
  }

  // Status is required
  if (!data.status || data.status.trim() === '') {
    errors.status = 'Status ist erforderlich';
  }

  // Plant validation
  if (data.plant && data.plant.length > 50) {
    errors.plant = 'Werk darf maximal 50 Zeichen haben';
  }

  // Location validation
  if (data.location && data.location.length > 100) {
    errors.location = 'Standort darf maximal 100 Zeichen haben';
  }

  // Date validation for maintenance windows
  if (data.maintenanceWindowStart) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.maintenanceWindowStart)) {
      errors.maintenanceWindowStart = 'Ungültiges Datumsformat';
    }
  }

  if (data.maintenanceWindowEnd) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.maintenanceWindowEnd)) {
      errors.maintenanceWindowEnd = 'Ungültiges Datumsformat';
    }
  }

  // Validate maintenance window range
  if (data.maintenanceWindowStart && data.maintenanceWindowEnd) {
    const start = new Date(data.maintenanceWindowStart);
    const end = new Date(data.maintenanceWindowEnd);
    if (end < start) {
      errors.maintenanceWindowEnd = 'Ende muss nach Start liegen';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ============================================
// EXCEL PARSING
// ============================================

/**
 * Read Excel file and extract asset data
 * @param {File} file - Excel file
 * @returns {Promise<Array>} Array of raw data objects
 */
export async function readAssetExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target.result;
        // Use global XLSX from SheetJS CDN
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const assets = XLSX.utils.sheet_to_json(worksheet);
        resolve(assets);
      } catch (error) {
        reject(new Error(`Failed to read Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get Excel workbook structure
 * @param {File} file - Excel file
 * @returns {Promise<Object>} Workbook structure with sheets info
 */
export async function getExcelStructure(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets = {};
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const rows = range.e.r - range.s.r + 1;
          const cols = range.e.c - range.s.c + 1;
          
          // Get header row
          const headerRow = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            range: 0 
          })[0] || [];
          
          sheets[sheetName] = {
            sheetName,
            rowCount: rows,
            columnCount: cols,
            columns: headerRow,
            isEmpty: rows <= 1
          };
        }
        
        resolve({
          fileName: file.name,
          fileSize: file.size,
          sheets
        });
      } catch (error) {
        reject(new Error(`Failed to analyze Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read specific sheet from Excel file
 * @param {File} file - Excel file
 * @param {string} sheetName - Sheet name to read
 * @returns {Promise<Array>} Array of raw data objects
 */
export async function readExcelSheet(file, sheetName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (!workbook.Sheets[sheetName]) {
          reject(new Error(`Sheet "${sheetName}" not found`));
          return;
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const assets = XLSX.utils.sheet_to_json(worksheet);
        resolve(assets);
      } catch (error) {
        reject(new Error(`Failed to read sheet: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

// ============================================
// DATA TRANSFORMATION
// ============================================

/**
 * Transform raw Excel data to standardized asset format
 * @param {Array} rawData - Array of raw data objects from Excel
 * @returns {Array} Array of transformed asset objects
 */
export function transformAssets(rawData) {
  return rawData.map((row, index) => ({
    id: String(row['Anlage'] || '').trim(),
    name: String(row['Beschreibung'] || '').trim() || 'Unknown',
    description: String(row['Beschreibung'] || row['Beschreibung'] || '').trim(),
    status: String(row['Status'] || 'AKTIV').trim(),
    location: String(row['Standort'] || '').trim(),
    parentId: String(row['Übergeordnet'] || '').trim() || null,
    replacementPart: String(row['Tauschartikel'] || '').trim() || null,
    damageClass: String(row['Schadensklasse'] || '').trim() || null,
    maintenanceWindowStart: parseDate(row['Wartungsfenster Start']),
    maintenanceWindowEnd: parseDate(row['Wartungsfenster Ende']),
    generalLedgerAccount: String(row['Hauptbuchkonto'] || '').trim(),
    plant: String(row['Werk'] || '').trim(),
    vassKey: String(row['VASS-Schlüssel'] || '').trim() || null,
    type: inferAssetType(String(row['Beschreibung'] || '')),
    rowNumber: index + 2 // For error reporting (1-indexed, + header row)
  }));
}

/**
 * Parse date value from Excel
 * @param {*} value - Date value (string or Excel serial number)
 * @returns {string|null} ISO date string or null
 */
export function parseDate(value) {
  if (!value) return null;

  // Handle Excel date numbers
  if (typeof value === 'number') {
    try {
      return new Date((value - 25569) * 86400 * 1000).toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  // Handle string dates
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return null;
    
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Process Excel import with validation
 * @param {File} file - Excel file
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import result with valid/invalid assets
 */
export async function processExcelImport(file, options = {}) {
  const result = {
    fileName: file.name,
    fileSize: file.size,
    totalRows: 0,
    valid: [],
    invalid: [],
    errors: [],
    warnings: []
  };

  try {
    // Read Excel file
    const rawData = await readAssetExcel(file);
    result.totalRows = rawData.length;

    // Transform data
    const transformed = transformAssets(rawData);

    // Validate each asset
    for (const asset of transformed) {
      try {
        const validated = validateAsset(asset);
        result.valid.push(validated);
      } catch (error) {
        result.invalid.push({
          row: asset.rowNumber,
          data: asset,
          error: error.message
        });
        result.errors.push(`Row ${asset.rowNumber}: ${error.message}`);
      }
    }

    // Check for duplicate IDs
    const ids = new Set();
    for (const asset of result.valid) {
      if (ids.has(asset.id)) {
        result.warnings.push(`Duplicate ID found: ${asset.id}`);
      }
      ids.add(asset.id);
    }

  } catch (error) {
    result.errors.push(`File processing error: ${error.message}`);
  }

  return result;
}

// ============================================
// EXPORT UTILITIES
// ============================================

/**
 * Export assets to JSON
 * @param {Array} assets - Array of asset objects
 * @param {string} filename - Output filename
 * @returns {void}
 */
export function exportAssetsToJson(assets, filename = 'assets-export.json') {
  const data = {
    exportedAt: new Date().toISOString(),
    count: assets.length,
    assets
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate unique ID
 * @param {string} prefix - ID prefix
 * @returns {string} Generated ID
 */
export function generateId(prefix = 'A') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// FILTER & SEARCH UTILITIES
// ============================================

/**
 * Filter assets by multiple criteria
 * @param {Array} assets - Array of assets
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered assets
 */
export function filterAssets(assets, filters) {
  let result = [...assets];

  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    result = result.filter(a =>
      a.id?.toLowerCase().includes(term) ||
      a.name?.toLowerCase().includes(term) ||
      a.description?.toLowerCase().includes(term) ||
      a.location?.toLowerCase().includes(term) ||
      a.plant?.toLowerCase().includes(term)
    );
  }

  if (filters.status) {
    result = result.filter(a => a.status === filters.status);
  }

  if (filters.plant) {
    result = result.filter(a => a.plant === filters.plant);
  }

  if (filters.type) {
    result = result.filter(a => a.type === filters.type);
  }

  if (filters.location) {
    result = result.filter(a => a.location === filters.location);
  }

  return result;
}

/**
 * Sort assets by field
 * @param {Array} assets - Array of assets
 * @param {string} field - Field to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted assets
 */
export function sortAssets(assets, field, direction = 'asc') {
  return [...assets].sort((a, b) => {
    const valA = a[field] || '';
    const valB = b[field] || '';
    
    let comparison = 0;
    if (typeof valA === 'string' && typeof valB === 'string') {
      comparison = valA.localeCompare(valB, 'de');
    } else {
      comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Get unique values from asset field
 * @param {Array} assets - Array of assets
 * @param {string} field - Field name
 * @returns {Array} Unique values
 */
export function getUniqueValues(assets, field) {
  const values = new Set();
  for (const asset of assets) {
    if (asset[field]) {
      values.add(asset[field]);
    }
  }
  return Array.from(values).sort();
}

// ============================================
// HTML ESCAPING
// ============================================

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

console.log('✓ Asset Utils module loaded');
