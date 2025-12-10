/**
 * asset-utils.js
 * 
 * Excel file parsing, data extraction, transformation, and validation
 * for the Asset Management module.
 */

// ============================================
// VALIDATION
// ============================================

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message, asset) {
    super(message);
    this.name = 'ValidationError';
    this.asset = asset;
  }
}

/**
 * Valid status values
 */
const VALID_STATUSES = ['IN BETRIEB', 'AKTIV', 'INAKTIV', 'STILLGELEGT'];

/**
 * Validate individual asset record
 * @param {Object} asset - Asset to validate
 * @returns {Object} Validated asset
 * @throws {ValidationError} If validation fails
 */
export function validateAsset(asset) {
  const errors = [];
  
  // Required fields
  if (!asset.id || String(asset.id).trim() === '') {
    errors.push('Asset ID (Anlage) is required');
  }
  
  if (!asset.name || String(asset.name).trim() === '') {
    errors.push('Asset name is required');
  } else if (String(asset.name).length > 100) {
    errors.push('Asset name must be 100 characters or less');
  }
  
  if (!asset.status || String(asset.status).trim() === '') {
    errors.push('Status is required');
  }
  
  // Status enum validation
  if (asset.status && !VALID_STATUSES.includes(asset.status)) {
    errors.push(`Invalid status: ${asset.status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  
  // Description length validation
  if (asset.description && String(asset.description).length > 500) {
    errors.push('Description must be 500 characters or less');
  }
  
  // Type inference from name if not provided
  if (!asset.type) {
    asset.type = inferAssetType(asset.name || '');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '), asset);
  }
  
  return asset;
}

/**
 * Validate multiple assets
 * @param {Array} assets - Assets to validate
 * @returns {Object} Result with valid and invalid assets
 */
export function validateAssets(assets) {
  const valid = [];
  const invalid = [];
  
  assets.forEach((asset, index) => {
    try {
      const validated = validateAsset(asset);
      valid.push(validated);
    } catch (error) {
      invalid.push({
        index,
        row: asset.rowNumber || index + 2,
        asset,
        error: error.message
      });
    }
  });
  
  return { valid, invalid };
}

// ============================================
// TYPE INFERENCE
// ============================================

/**
 * Infer asset type from name
 * @param {string} name - Asset name
 * @returns {string} Inferred type
 */
export function inferAssetType(name) {
  const typePatterns = {
    'LVUM': /LVUM|LV-UM|LV-EN|LICHT.*UMSCHALT/i,
    'UV': /UV-|KRAFT|UNTERVERTEILER/i,
    'KV': /KV-|KV_|KRAFTVERTEILER/i,
    'LV': /LV-|LICHTVERTEILER/i,
  };
  
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(name)) return type;
  }
  return 'OTHER';
}

// ============================================
// EXCEL PARSING
// ============================================

/**
 * Read Excel file and extract asset data.
 * 
 * DEPENDENCY: This function requires the SheetJS (XLSX) library to be loaded
 * globally. In the main application, this is loaded via CDN in index.html:
 * <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
 * 
 * @param {File} file - Excel file (.xlsx or .xls)
 * @returns {Promise<Array>} Array of raw row objects parsed from the first sheet
 * @throws {Error} If XLSX library is not loaded or file parsing fails
 */
export async function readAssetExcel(file) {
  return new Promise((resolve, reject) => {
    // Check if XLSX is available (global dependency loaded via CDN)
    if (typeof XLSX === 'undefined') {
      reject(new Error('SheetJS library (XLSX) is not loaded. Ensure the library is included in index.html'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        resolve(rows);
      } catch (error) {
        reject(new Error(`Failed to read Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Detect Excel file structure and available columns
 * @param {File} file - Excel file
 * @returns {Promise<Object>} Structure info with sheets and columns
 */
export async function detectExcelStructure(file) {
  return new Promise((resolve, reject) => {
    if (typeof XLSX === 'undefined') {
      reject(new Error('SheetJS library (XLSX) is not loaded'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = event.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          
          // Get headers from first row
          const headers = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const cell = worksheet[cellRef];
            headers.push(cell ? String(cell.v) : `Column ${col + 1}`);
          }
          
          sheets[sheetName] = {
            sheetName,
            rowCount: range.e.r - range.s.r,
            columns: headers,
            isEmpty: range.e.r === range.s.r && range.e.c === range.s.c
          };
        });
        
        resolve({
          fileName: file.name,
          sheets,
          sheetNames: workbook.SheetNames
        });
      } catch (error) {
        reject(new Error(`Failed to analyze Excel file: ${error.message}`));
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
 * Excel column mapping to database fields
 */
const COLUMN_MAPPING = {
  'Anlage': 'id',
  'Beschreibung': 'name', // First occurrence is name, second is description
  'Status': 'status',
  'Standort': 'location',
  'Übergeordnet': 'parentId',
  'Tauschartikel': 'replacementPart',
  'Schadensklasse': 'damageClass',
  'Wartungsfenster Start': 'maintenanceWindowStart',
  'Wartungsfenster Ende': 'maintenanceWindowEnd',
  'Hauptbuchkonto': 'generalLedgerAccount',
  'Werk': 'plant',
  'VASS-Schlüssel': 'vassKey'
};

/**
 * Transform raw Excel data to standardized asset format
 * @param {Array} rawData - Raw Excel rows
 * @returns {Array} Transformed asset objects
 */
export function transformAssets(rawData) {
  return rawData.map((row, index) => {
    // Handle the case where 'Beschreibung' appears twice
    // First is name (short), second is description (long)
    const name = getColumnValue(row, 'Beschreibung') || 
                 getColumnValue(row, 'Name') || 
                 'Unknown';
    
    // Try to find a longer description field
    const description = getColumnValue(row, 'Beschreibung Langtext') ||
                        getColumnValue(row, 'Langbeschreibung') ||
                        getColumnValue(row, 'Full Description') ||
                        name;
    
    return {
      id: String(getColumnValue(row, 'Anlage') || '').trim(),
      name: String(name).trim().substring(0, 100),
      description: String(description).trim().substring(0, 500),
      status: normalizeStatus(getColumnValue(row, 'Status')),
      location: String(getColumnValue(row, 'Standort') || '').trim(),
      parentId: normalizeNullableString(getColumnValue(row, 'Übergeordnet')),
      replacementPart: normalizeNullableString(getColumnValue(row, 'Tauschartikel')),
      damageClass: normalizeNullableString(getColumnValue(row, 'Schadensklasse')),
      maintenanceWindowStart: parseDate(getColumnValue(row, 'Wartungsfenster Start')),
      maintenanceWindowEnd: parseDate(getColumnValue(row, 'Wartungsfenster Ende')),
      generalLedgerAccount: String(getColumnValue(row, 'Hauptbuchkonto') || '').trim(),
      plant: String(getColumnValue(row, 'Werk') || '').trim(),
      vassKey: normalizeNullableString(getColumnValue(row, 'VASS-Schlüssel')),
      rowNumber: index + 2 // For error reporting (row 1 is header)
    };
  });
}

/**
 * Get column value with case-insensitive matching
 * @param {Object} row - Row object
 * @param {string} columnName - Column name to find
 * @returns {*} Column value or undefined
 */
function getColumnValue(row, columnName) {
  // Direct match
  if (row[columnName] !== undefined) {
    return row[columnName];
  }
  
  // Case-insensitive match
  const lowerName = columnName.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lowerName) {
      return row[key];
    }
  }
  
  return undefined;
}

/**
 * Normalize status value
 * @param {*} value - Raw status value
 * @returns {string} Normalized status
 */
function normalizeStatus(value) {
  if (!value) return 'AKTIV';
  
  const normalized = String(value).trim().toUpperCase();
  
  // Map common variations
  const statusMap = {
    'IN BETRIEB': 'IN BETRIEB',
    'INBETRIEB': 'IN BETRIEB',
    'AKTIV': 'AKTIV',
    'ACTIVE': 'AKTIV',
    'INAKTIV': 'INAKTIV',
    'INACTIVE': 'INAKTIV',
    'STILLGELEGT': 'STILLGELEGT',
    'DECOMMISSIONED': 'STILLGELEGT'
  };
  
  return statusMap[normalized] || 'AKTIV';
}

/**
 * Normalize nullable string values
 * @param {*} value - Raw value
 * @returns {string|null} Normalized value or null
 */
function normalizeNullableString(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Parse date value from Excel
 * @param {*} value - Raw date value
 * @returns {string|null} ISO date string or null
 */
export function parseDate(value) {
  if (!value) return null;
  
  // Handle Excel date numbers
  if (typeof value === 'number') {
    // Excel date serial number (days since 1900-01-01)
    const date = new Date((value - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  
  // Handle string dates
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Try various date formats
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    
    // Try German date format (DD.MM.YYYY)
    const germanMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (germanMatch) {
      const [, day, month, year] = germanMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isNaN(date.getTime()) ? null : date.toISOString();
    }
  }
  
  return null;
}

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate unique asset ID
 * @returns {string} Generated ID
 */
export function generateId() {
  return `AST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Format asset data for Excel export
 * @param {Array} assets - Assets to export
 * @returns {Array} Formatted rows for Excel
 */
export function formatAssetsForExport(assets) {
  return assets.map(asset => ({
    'Anlage': asset.id,
    'Name': asset.name,
    'Beschreibung': asset.description,
    'Typ': asset.type,
    'Status': asset.status,
    'Standort': asset.location,
    'Übergeordnet': asset.parentId || '',
    'Tauschartikel': asset.replacementPart || '',
    'Schadensklasse': asset.damageClass || '',
    'Wartungsfenster Start': asset.maintenanceWindowStart ? formatDateForExport(asset.maintenanceWindowStart) : '',
    'Wartungsfenster Ende': asset.maintenanceWindowEnd ? formatDateForExport(asset.maintenanceWindowEnd) : '',
    'Hauptbuchkonto': asset.generalLedgerAccount || '',
    'Werk': asset.plant || '',
    'VASS-Schlüssel': asset.vassKey || '',
    'Importiert am': asset.importedAt ? formatDateForExport(asset.importedAt) : '',
    'Zuletzt aktualisiert': asset.lastUpdated ? formatDateForExport(asset.lastUpdated) : ''
  }));
}

/**
 * Format date for export
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDateForExport(isoDate) {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return '';
  }
}

console.log('✓ Asset Utils module loaded');
