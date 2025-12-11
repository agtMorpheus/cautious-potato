/**
 * protokoll-renderer.js
 * 
 * Handles all UI rendering and updates for the Protokoll module.
 * Dynamically generates form HTML and updates DOM based on state changes.
 * Based on vorlage_protokoll.md - VDE 0100 Prüfprotokoll
 * German interface language
 */

import * as state from './protokoll-state.js';
import * as handlers from './protokoll-handlers.js';
import * as messgeraetState from '../messgeraet/messgeraet-state.js';

// ============================================
// CONSTANTS
// ============================================

const CONTAINER_ID = 'protokollFormContainer';
const MESSAGE_CONTAINER_ID = 'messageContainer';
const STEPS = ['metadata', 'besichtigung', 'erproben', 'messen', 'positions', 'results', 'review'];
const FORM_IDS = {
  metadata: 'metadataForm',
  besichtigung: 'besichtigungForm',
  erproben: 'erprobenForm',
  messen: 'messenForm',
  positions: 'positionsForm',
  results: 'resultsForm',
  review: 'reviewForm'
};

// German step labels
const STEP_LABELS = {
  metadata: 'Kopfdaten',
  besichtigung: 'Besichtigung',
  erproben: 'Erproben',
  messen: 'Messen',
  positions: 'Stromkreise',
  results: 'Ergebnis',
  review: 'Übersicht'
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the renderer module
 * @returns {void}
 */
export function init() {
  console.log('Initializing Protokoll Renderer');
  
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.error(`Container ${CONTAINER_ID} not found`);
    return;
  }

  // Subscribe to state changes
  setupStateSubscriptions();

  // Render initial form based on current state
  const currentStep = state.getCurrentStep();
  renderStep(currentStep);

  console.log('✓ Renderer initialized');
}

/**
 * Set up subscriptions to state change events
 * @returns {void}
 */
function setupStateSubscriptions() {
  // Listen for step changes
  document.addEventListener('protokoll:stepChanged', (e) => {
    renderStep(e.detail.step);
  });

  // Listen for validation errors
  document.addEventListener('protokoll:validationError', (e) => {
    const { fieldPath, error } = e.detail;
    if (error) {
      displayFieldError(fieldPath, error);
    } else {
      clearFieldError(fieldPath);
    }
  });

  // Listen for messages
  document.addEventListener('protokoll:message', (e) => {
    displayMessage(e.detail.type, e.detail.message);
  });

  // Listen for position additions
  document.addEventListener('protokoll:addPosition', (e) => {
    addPositionRow(e.detail.position);
  });

  // Listen for position removals
  document.addEventListener('protokoll:removePosition', (e) => {
    removePositionRow(e.detail.posNr);
  });

  // Listen for reset
  document.addEventListener('protokoll:reset', () => {
    renderStep('metadata');
  });
}

// ============================================
// MAIN RENDERING FUNCTIONS
// ============================================

/**
 * Render entire form for current step
 * @param {string} step - Step to render
 * @returns {void}
 */
export function renderStep(step) {
  console.log(`Rendering step: ${step}`);
  
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // Hide all forms
  for (const formId of Object.values(FORM_IDS)) {
    const form = document.getElementById(formId);
    if (form) form.style.display = 'none';
  }

  // Render current form
  switch (step) {
    case 'metadata':
      renderMetadataForm();
      break;
    case 'besichtigung':
      renderBesichtigungForm();
      break;
    case 'erproben':
      renderErprobenForm();
      break;
    case 'messen':
      renderMessenForm();
      break;
    case 'positions':
      renderPositionsForm();
      break;
    case 'results':
      renderResultsForm();
      break;
    case 'review':
      renderReviewForm();
      break;
    default:
      console.error(`Unknown step: ${step}`);
      renderMetadataForm();
  }

  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Render metadata form (Step 1) - Kopfdaten
 * Based on vorlage_protokoll.md - German interface
 * @returns {void}
 */
export function renderMetadataForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const metadata = state.getMetadata();

  const html = `
    <form id="${FORM_IDS.metadata}" class="protokoll-form metadata-form">
      ${renderProgressIndicator('metadata')}

      <fieldset>
        <legend>Prüfprotokoll VDE 0100</legend>
        <div class="form-row">
          ${renderTextField('metadata.protokollNumber', 'Prüfprotokoll Nr.', metadata.protokollNumber, {
            required: true,
            placeholder: 'z.B. EDM221020251123'
          })}
          ${renderDateField('metadata.datum', 'Datum', metadata.datum, { required: true })}
        </div>
        <div class="form-row">
          ${renderTextField('metadata.blatt', 'Blatt', metadata.blatt, { placeholder: '1' })}
          ${renderTextField('metadata.blattVon', 'von', metadata.blattVon, { placeholder: '3' })}
        </div>
      </fieldset>

      <fieldset>
        <legend>Auftraggeber</legend>
        <div class="form-row">
          ${renderTextField('metadata.auftraggeber', 'Auftraggeber', metadata.auftraggeber, { required: true })}
          ${renderTextField('metadata.auftragnummer', 'Auftrag Nr.', metadata.auftragnummer)}
        </div>
        ${renderTextField('metadata.kundennummer', 'Kunden Nr.', metadata.kundennummer)}
      </fieldset>

      <fieldset>
        <legend>Auftragnehmer</legend>
        ${renderTextField('metadata.auftragnehmer', 'Firma', metadata.auftragnehmer)}
        ${renderTextField('metadata.auftragnehmerOrt', 'Ort', metadata.auftragnehmerOrt)}
      </fieldset>

      <fieldset>
        <legend>Kunde / Prüfobjekt</legend>
        ${renderTextField('metadata.kunde', 'Kunde', metadata.kunde, { placeholder: 'z.B. Volkswagen AG, Werk Wolfsburg' })}
        ${renderTextField('metadata.kundeOrt', 'Kunde Ort', metadata.kundeOrt, { placeholder: 'z.B. Berliner Ring 2, 38436 Wolfsburg' })}
        ${renderTextField('metadata.firma', 'Firma', metadata.firma, { placeholder: 'z.B. EAW Wolfsburg' })}
        ${renderTextField('metadata.firmaOrt', 'Firma Ort', metadata.firmaOrt, { placeholder: 'z.B. Dieselstraße 27, 38446 Wolfsburg' })}
      </fieldset>

      <fieldset>
        <legend>Anlage</legend>
        ${renderTextField('metadata.facility.anlage', 'Anlage', metadata.facility?.anlage || '', { placeholder: 'z.B. LVUM-Fc34' })}
        ${renderTextField('metadata.facility.ort', 'Ort', metadata.facility?.ort || '', { placeholder: 'z.B. Halle 3' })}
        ${renderTextField('metadata.facility.inv', 'INV (Inventar-Nr.)', metadata.facility?.inv || '', { placeholder: 'z.B. E03150AP17000093243' })}
      </fieldset>

      <fieldset>
        <legend>Prüfen nach</legend>
        <div class="checkbox-group">
          ${renderCheckboxField('metadata.prüfenNach.dinVde0100Gruppe700', metadata.prüfenNach?.dinVde0100Gruppe700, 'DIN VDE 0100 Gruppe 700')}
          ${renderCheckboxField('metadata.prüfenNach.dinVde01000600', metadata.prüfenNach?.dinVde01000600, 'DIN VDE 0100-0600')}
          ${renderCheckboxField('metadata.prüfenNach.dinVde01050100', metadata.prüfenNach?.dinVde01050100, 'DIN VDE 0105-0100')}
        </div>
        <div class="checkbox-group" style="margin-top: 0.5rem;">
          ${renderCheckboxField('metadata.dguvV3', metadata.dguvV3, 'DGUV V3')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Prüfungsart</legend>
        <div class="checkbox-group">
          ${renderCheckboxField('metadata.neuanlage', metadata.neuanlage, 'Neuanlage')}
          ${renderCheckboxField('metadata.erweiterung', metadata.erweiterung, 'Erweiterung')}
          ${renderCheckboxField('metadata.änderung', metadata.änderung, 'Änderung')}
          ${renderCheckboxField('metadata.instandsetzung', metadata.instandsetzung, 'Instandsetzung')}
          ${renderCheckboxField('metadata.wiederholungsprüfung', metadata.wiederholungsprüfung, 'Wiederholungsprüfung')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Netz</legend>
        <div class="form-row">
          ${renderSelectField('metadata.facility.netzspannung', 'Netzspannung', 
            ['230 / 400 V', '400 / 230 V', '230V', '400V'], 
            metadata.facility?.netzspannung || '230 / 400 V'
          )}
          ${renderSelectField('metadata.facility.netzform', 'Netzform',
            ['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT'],
            metadata.facility?.netzform || 'TN-S'
          )}
        </div>
        ${renderTextField('metadata.facility.netzbetreiber', 'Netzbetreiber', metadata.facility?.netzbetreiber || '')}
      </fieldset>

      <fieldset>
        <legend>Verantwortlicher Prüfer</legend>
        <div class="form-row">
          ${renderTextField('metadata.prüfer.name', 'Name', metadata.prüfer?.name || '', { required: true })}
          ${renderTextField('metadata.prüfer.titel', 'Titel', metadata.prüfer?.titel || '')}
        </div>
        ${renderTextField('metadata.prüfer.ort', 'Ort', metadata.prüfer?.ort || '')}
      </fieldset>

      ${renderFormNavigation('metadata')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
}

/**
 * Render Besichtigung form (Step 2) - Visual Inspection
 * Based on vorlage_protokoll.md - German interface
 * @returns {void}
 */
export function renderBesichtigungForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const besichtigung = state.getBesichtigung();

  const html = `
    <form id="${FORM_IDS.besichtigung}" class="protokoll-form besichtigung-form">
      ${renderProgressIndicator('besichtigung')}

      <fieldset>
        <legend>Besichtigung</legend>
        <p class="fieldset-description">Sichtprüfung der elektrischen Anlage - i.O. = in Ordnung, n.i.O. = nicht in Ordnung</p>
        
        <div class="inspection-table">
          <div class="inspection-header">
            <span class="inspection-label-header">Prüfpunkt</span>
            <span class="inspection-io-header">i.O.</span>
            <span class="inspection-nio-header">n.i.O.</span>
          </div>
          
          ${renderInspectionRow('besichtigung.auswahlBetriebsmittel', 'Auswahl der Betriebsmittel', besichtigung.auswahlBetriebsmittel)}
          ${renderInspectionRow('besichtigung.trennSchaltgeräte', 'Trenn- und Schaltgeräte', besichtigung.trennSchaltgeräte)}
          ${renderInspectionRow('besichtigung.brandabschottungen', 'Brandabschottungen', besichtigung.brandabschottungen)}
          ${renderInspectionRow('besichtigung.gebäudesystemtechnik', 'Gebäudesystemtechnik', besichtigung.gebäudesystemtechnik)}
          ${renderInspectionRow('besichtigung.kabelLeitungenStromschienen', 'Kabel, Leitungen, Stromschienen', besichtigung.kabelLeitungenStromschienen)}
          ${renderInspectionRow('besichtigung.kennzStromkrBetriebsmittel', 'Kennz., Stromkr., Betriebsmittel', besichtigung.kennzStromkrBetriebsmittel)}
          ${renderInspectionRow('besichtigung.kennzeichnungNPELeiter', 'Kennzeichnung N- und PE-Leiter', besichtigung.kennzeichnungNPELeiter)}
          ${renderInspectionRow('besichtigung.leiterverbindungen', 'Leiterverbindungen', besichtigung.leiterverbindungen)}
          ${renderInspectionRow('besichtigung.schutzÜberwachungseinrichtungen', 'Schutz- und Überwachungseinrichtungen', besichtigung.schutzÜberwachungseinrichtungen)}
          ${renderInspectionRow('besichtigung.basisschutzDirektBerühren', 'Basisschutz, Schutz gegen direkt. Berühren', besichtigung.basisschutzDirektBerühren)}
          ${renderInspectionRow('besichtigung.zugänglichkeit', 'Zugänglichkeit', besichtigung.zugänglichkeit)}
          ${renderInspectionRow('besichtigung.schutzpotentialausgleich', 'Schutzpotentialausgleich', besichtigung.schutzpotentialausgleich)}
          ${renderInspectionRow('besichtigung.zusÖrtlPotentialausgleich', 'zus. örtl. Potentialausgleich', besichtigung.zusÖrtlPotentialausgleich)}
          ${renderInspectionRow('besichtigung.dokumentation', 'Dokumentation', besichtigung.dokumentation)}
          ${renderInspectionRow('besichtigung.reinigungSchaltschrank', 'Reinigung des Schaltschranks', besichtigung.reinigungSchaltschrank)}
        </div>

        <div class="checkbox-group" style="margin-top: 1rem;">
          ${renderCheckboxField('besichtigung.ergänzungsblätter', besichtigung.ergänzungsblätter, 'siehe Ergänzungsblätter')}
        </div>
      </fieldset>

      ${renderFormNavigation('besichtigung')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
}

/**
 * Render Erproben form (Step 3) - Testing
 * Based on vorlage_protokoll.md - German interface
 * @returns {void}
 */
export function renderErprobenForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const erproben = state.getErproben();

  const html = `
    <form id="${FORM_IDS.erproben}" class="protokoll-form erproben-form">
      ${renderProgressIndicator('erproben')}

      <fieldset>
        <legend>Erproben</legend>
        <p class="fieldset-description">Funktionsprüfungen - i.O. = in Ordnung, n.i.O. = nicht in Ordnung</p>
        
        <div class="inspection-table">
          <div class="inspection-header">
            <span class="inspection-label-header">Prüfpunkt</span>
            <span class="inspection-io-header">i.O.</span>
            <span class="inspection-nio-header">n.i.O.</span>
          </div>
          
          ${renderInspectionRow('erproben.funktionsprüfungAnlage', 'Funktionsprüfung der Anlage', erproben.funktionsprüfungAnlage)}
          ${renderInspectionRow('erproben.rcdSchutzschalter', 'RCD-Schutzschalter', erproben.rcdSchutzschalter)}
          ${renderInspectionRow('erproben.schraubverbKlemmstellen', 'Schraubverb. u. Klemmstellen auf festen Sitz', erproben.schraubverbKlemmstellen)}
          ${renderInspectionRow('erproben.funktionSchutzSicherheitsÜberwachung', 'Funktion der Schutz-, Sicherheits- und Überwachungseinrichtungen', erproben.funktionSchutzSicherheitsÜberwachung)}
          ${renderInspectionRow('erproben.drehrichtungMotoren', 'Drehrichtung der Motoren', erproben.drehrichtungMotoren)}
          ${renderInspectionRow('erproben.rechtsdrehfelderDrehstromsteckdose', 'Rechtsdrehfelder der Drehstromsteckdose', erproben.rechtsdrehfelderDrehstromsteckdose)}
          ${renderInspectionRow('erproben.gebäudesystemtechnikErproben', 'Gebäudesystemtechnik', erproben.gebäudesystemtechnikErproben)}
        </div>
      </fieldset>

      ${renderFormNavigation('erproben')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
}

/**
 * Render Messen form (Step 4) - Measurement
 * Based on vorlage_protokoll.md - German interface
 * @returns {void}
 */
export function renderMessenForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const messen = state.getMessen();
  const messgeräte = state.getMessgeräte();
  
  // Get available devices from Messgerät module
  let deviceDropdownOptions = '';
  try {
    const devices = messgeraetState.getDevicesForDropdown();
    if (devices && devices.length > 0) {
      deviceDropdownOptions = devices.map(d => {
        const expiredClass = d.isExpired ? ' (Abgelaufen)' : '';
        return `<option value="${escapeHtml(d.id)}" data-device='${escapeHtml(JSON.stringify(d))}'>${escapeHtml(d.label)}${expiredClass}</option>`;
      }).join('');
    }
  } catch (error) {
    console.warn('Messgerät module not available:', error);
  }

  const html = `
    <form id="${FORM_IDS.messen}" class="protokoll-form messen-form">
      ${renderProgressIndicator('messen')}

      <fieldset>
        <legend>Messen</legend>
        <div class="checkbox-group">
          ${renderCheckboxField('messen.durchgängigkeitPotentialausgleich', messen.durchgängigkeitPotentialausgleich, 'Durchgängigkeit des Potentialausgleich (≤ 0,1Ω nachgewiesen)')}
          ${renderCheckboxField('messen.gebäudekonstruktion', messen.gebäudekonstruktion, 'Gebäudekonstruktion')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Verwendete Messgeräte nach DIN VDE 0413</legend>
        ${deviceDropdownOptions ? `
          <div class="form-group">
            <label for="messgeraet-select">Messgerät aus Datenbank wählen</label>
            <select id="messgeraet-select" class="form-control" data-action="select-device">
              <option value="">-- Manuell eingeben oder Gerät wählen --</option>
              ${deviceDropdownOptions}
            </select>
            <p class="field-hint">Wählen Sie ein Messgerät aus der Datenbank oder geben Sie die Daten manuell ein.</p>
          </div>
          <hr class="form-divider">
        ` : `
          <div class="form-notice">
            <p>Keine Messgeräte in der Datenbank. <a href="#messgeraet" data-view="messgeraet">Messgeräte verwalten →</a></p>
          </div>
        `}
        <div class="form-row">
          ${renderTextField('messgeräte.fabrikat', 'Fabrikat', messgeräte.fabrikat, { placeholder: 'z.B. Fluke' })}
          ${renderTextField('messgeräte.typ', 'Typ', messgeräte.typ, { placeholder: 'z.B. 1654b' })}
        </div>
        <div class="form-row">
          ${renderTextField('messgeräte.nächsteKalibrierung', 'Nächste Kalibrierung', messgeräte.nächsteKalibrierung, { placeholder: 'z.B. 01.05.26' })}
          ${renderTextField('messgeräte.identNr', 'Ident-Nr.', messgeräte.identNr, { placeholder: 'z.B. 4312061' })}
        </div>
      </fieldset>

      ${renderFormNavigation('messen')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
  attachDeviceSelectListener();
}

/**
 * Render positions form (Step 5) - Stromkreise
 * Based on vorlage_protokoll.md - German interface
 * @returns {void}
 */
export function renderPositionsForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const positions = state.getPositions();
  const einspeisung = state.getEinspeisung();

  const html = `
    <form id="${FORM_IDS.positions}" class="protokoll-form positions-form">
      ${renderProgressIndicator('positions')}

      <fieldset>
        <legend>Einspeisung</legend>
        ${renderTextField('einspeisung', 'Einspeisung', einspeisung, { placeholder: 'z.B. KV-Fc30/AF2; KAV-Fb42/BF22;' })}
      </fieldset>

      <div class="positions-section">
        <h3>Stromkreise</h3>
        <p class="section-description">Messwerte und Prüfergebnisse der einzelnen Stromkreise</p>
        
        <div class="positions-table-wrapper">
          <table class="positions-table" role="grid" aria-label="Stromkreis-Tabelle">
            <thead>
              <tr>
                <th scope="col">Pos.Nr.</th>
                <th scope="col">Zielbezeichnung</th>
                <th scope="col">Phase</th>
                <th scope="col">Leitung/Kabel</th>
                <th scope="col">Un (V)</th>
                <th scope="col">fn (Hz)</th>
                <th scope="col">Überstrom-Schutz</th>
                <th scope="col">In (A)</th>
                <th scope="col">Riso (MΩ)</th>
                <th scope="col">Status</th>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody id="positionsTableBody">
              ${positions.map((pos, idx) => renderPositionRow(pos, idx)).join('')}
            </tbody>
          </table>
        </div>

        <button type="button" class="btn btn-secondary" data-action="add-position">
          + Position hinzufügen
        </button>
      </div>

      ${renderFormNavigation('positions')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
  attachPositionListeners();
}

/**
 * Render results form (Step 6) - Prüfungsergebnis
 * Based on vorlage_protokoll.md - German interface
 * @returns {void}
 */
export function renderResultsForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const results = state.getPrüfungsergebnis();
  const mängel = state.getMängel();

  const html = `
    <form id="${FORM_IDS.results}" class="protokoll-form results-form">
      ${renderProgressIndicator('results')}

      <fieldset>
        <legend>Prüfungsergebnis</legend>
        <div class="checkbox-group">
          ${renderCheckboxField('prüfungsergebnis.keineMängelFestgestellt', results.keineMängelFestgestellt, 'keine Mängel festgestellt')}
          ${renderCheckboxField('prüfungsergebnis.mängelFestgestellt', results.mängelFestgestellt, 'Mängel festgestellt')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Prüfplakette angebracht</legend>
        <div class="checkbox-group">
          ${renderCheckboxField('prüfungsergebnis.plaketteJa', results.plaketteJa, 'ja')}
          ${renderCheckboxField('prüfungsergebnis.plaketteNein', results.plaketteNein, 'nein')}
        </div>
      </fieldset>

      <fieldset>
        <legend>Nächster Prüfungstermin</legend>
        ${renderTextField('prüfungsergebnis.nächsterPrüfungstermin', 'Nächster Prüfungstermin', results.nächsterPrüfungstermin, { 
          placeholder: 'z.B. set./ 2027'
        })}
      </fieldset>

      <fieldset>
        <legend>Bemerkung</legend>
        ${renderTextareaField('prüfungsergebnis.bemerkung', 'Bemerkung', results.bemerkung, { placeholder: 'Zusätzliche Bemerkungen...' })}
      </fieldset>

      <fieldset>
        <legend>Mängel</legend>
        ${renderTextareaField('mängel', 'Mängel', mängel, { placeholder: 'Beschreibung der festgestellten Mängel...' })}
      </fieldset>

      ${renderFormNavigation('results')}
    </form>
  `;

  container.innerHTML = html;
  attachFieldListeners();
}

/**
 * Render review form (Step 7) - Übersicht
 * Based on vorlage_protokoll.md - German interface
 * @returns {void}
 */
export function renderReviewForm() {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const metadata = state.getMetadata();
  const besichtigung = state.getBesichtigung();
  const erproben = state.getErproben();
  const messen = state.getMessen();
  const messgeräte = state.getMessgeräte();
  const positions = state.getPositions();
  const results = state.getPrüfungsergebnis();
  const einspeisung = state.getEinspeisung();
  const mängel = state.getMängel();

  const html = `
    <div id="${FORM_IDS.review}" class="protokoll-form review-form">
      ${renderProgressIndicator('review')}

      <div class="review-section">
        <h3>Protokoll Übersicht</h3>
        
        <div class="review-block">
          <h4>Kopfdaten</h4>
          <dl class="review-dl">
            <dt>Prüfprotokoll Nr.:</dt>
            <dd>${escapeHtml(metadata.protokollNumber || '-')}</dd>
            <dt>Datum:</dt>
            <dd>${escapeHtml(metadata.datum ? formatDate(metadata.datum) : '-')}</dd>
            <dt>Auftraggeber:</dt>
            <dd>${escapeHtml(metadata.auftraggeber || '-')}</dd>
            <dt>Auftrag Nr.:</dt>
            <dd>${escapeHtml(metadata.auftragnummer || '-')}</dd>
            <dt>Kunde:</dt>
            <dd>${escapeHtml(metadata.kunde || '-')}</dd>
            <dt>Kunde Ort:</dt>
            <dd>${escapeHtml(metadata.kundeOrt || '-')}</dd>
            <dt>Anlage:</dt>
            <dd>${escapeHtml(metadata.facility?.anlage || '-')}</dd>
            <dt>Ort:</dt>
            <dd>${escapeHtml(metadata.facility?.ort || '-')}</dd>
            <dt>INV:</dt>
            <dd>${escapeHtml(metadata.facility?.inv || '-')}</dd>
            <dt>Prüfer:</dt>
            <dd>${escapeHtml(metadata.prüfer?.name || '-')}</dd>
          </dl>
        </div>

        <div class="review-block">
          <h4>Messgeräte</h4>
          <dl class="review-dl">
            <dt>Fabrikat:</dt>
            <dd>${escapeHtml(messgeräte.fabrikat || '-')}</dd>
            <dt>Typ:</dt>
            <dd>${escapeHtml(messgeräte.typ || '-')}</dd>
            <dt>Nächste Kalibrierung:</dt>
            <dd>${escapeHtml(messgeräte.nächsteKalibrierung || '-')}</dd>
            <dt>Ident-Nr.:</dt>
            <dd>${escapeHtml(messgeräte.identNr || '-')}</dd>
          </dl>
        </div>

        <div class="review-block">
          <h4>Stromkreise (${positions.length})</h4>
          ${positions.length > 0 ? `
            <table class="review-table" role="grid" aria-label="Stromkreis-Übersicht">
              <thead>
                <tr>
                  <th scope="col">Nr.</th>
                  <th scope="col">Stromkreis</th>
                  <th scope="col">Zielbezeichnung</th>
                  <th scope="col">Phase</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                ${positions.map((pos, idx) => `
                  <tr${pos.parentCircuitId ? ' class="child-circuit"' : ''}>
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(pos.stromkreisNr || '-')}</td>
                    <td>${escapeHtml(pos.zielbezeichnung || '-')}</td>
                    <td><span class="phase-badge phase-${escapeHtml(pos.phaseType || 'mono')}">${getPhaseTypeLabel(pos.phaseType)}</span></td>
                    <td><span class="status-badge status-${pos.prüfergebnis?.status || 'nicht-geprüft'}">${escapeHtml(pos.prüfergebnis?.status || 'nicht-geprüft')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p class="no-positions">Keine Stromkreise hinzugefügt.</p>'}
        </div>

        <div class="review-block">
          <h4>Prüfungsergebnis</h4>
          <dl class="review-dl">
            <dt>Mängel:</dt>
            <dd>${results.keineMängelFestgestellt ? 'Keine Mängel festgestellt' : results.mängelFestgestellt ? 'Mängel festgestellt' : '-'}</dd>
            <dt>Prüfplakette:</dt>
            <dd>${results.plaketteJa ? 'Ja' : results.plaketteNein ? 'Nein' : '-'}</dd>
            <dt>Nächster Prüfungstermin:</dt>
            <dd>${escapeHtml(results.nächsterPrüfungstermin || '-')}</dd>
            ${results.bemerkung ? `<dt>Bemerkung:</dt><dd>${escapeHtml(results.bemerkung)}</dd>` : ''}
            ${mängel ? `<dt>Mängelbeschreibung:</dt><dd>${escapeHtml(mängel)}</dd>` : ''}
          </dl>
        </div>
      </div>

      <div class="export-section">
        <h3>Protokoll exportieren</h3>
        <div class="export-buttons">
          <button type="button" class="btn btn-primary" data-action="export-protokoll">
            Protokoll.xlsx exportieren
          </button>
          <button type="button" class="btn btn-primary" data-action="export-abrechnung">
            Abrechnung.xlsx exportieren
          </button>
          <button type="button" class="btn btn-success" data-action="export-both">
            Beide Dateien exportieren
          </button>
        </div>
      </div>

      ${renderFormNavigation('review')}
    </div>
  `;

  container.innerHTML = html;
  attachExportListeners();
}

// ============================================
// FIELD RENDERING FUNCTIONS
// ============================================

/**
 * Render a text input field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {Object} options - Field options
 * @returns {string} HTML string
 */
function renderTextField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required aria-required="true"' : '';
  const pattern = options.pattern ? `pattern="${options.pattern}"` : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
      <input
        type="text"
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${escapeHtml(value || '')}"
        ${required}
        ${pattern}
        ${options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : ''}
        class="form-control"
        autocomplete="off"
      >
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a date input field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {string} value - Current value (ISO string)
 * @param {Object} options - Field options
 * @returns {string} HTML string
 */
function renderDateField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required aria-required="true"' : '';
  const dateValue = value ? value.split('T')[0] : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
      <input
        type="date"
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${dateValue}"
        ${required}
        class="form-control"
      >
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a textarea field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {Object} options - Field options
 * @returns {string} HTML string
 */
function renderTextareaField(fieldPath, label, value, options = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const required = options.required ? 'required aria-required="true"' : '';
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}${options.required ? ' <span class="required" aria-hidden="true">*</span>' : ''}</label>
      <textarea
        id="${id}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        ${required}
        rows="3"
        class="form-control"
      >${escapeHtml(value || '')}</textarea>
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a select field
 * @param {string} fieldPath - Field path for data binding
 * @param {string} label - Field label
 * @param {Array} options - Select options
 * @param {string} selected - Currently selected value
 * @returns {string} HTML string
 */
function renderSelectField(fieldPath, label, options, selected) {
  const id = fieldPath.replace(/\./g, '-');
  
  return `
    <div class="form-group">
      <label for="${id}">${escapeHtml(label)}</label>
      <select id="${id}" name="${fieldPath}" data-field="${fieldPath}" class="form-control">
        <option value="">-- Select --</option>
        ${options.map(opt => `
          <option value="${escapeHtml(String(opt))}" ${opt === selected ? 'selected' : ''}>
            ${escapeHtml(String(opt))}
          </option>
        `).join('')}
      </select>
      <div class="field-error" id="error-${id}" role="alert" aria-live="polite"></div>
    </div>
  `;
}

/**
 * Render a checkbox field
 * @param {string} fieldId - Field ID
 * @param {boolean} checked - Whether checked
 * @param {string} label - Field label
 * @returns {string} HTML string
 */
function renderCheckboxField(fieldId, checked, label) {
  return `
    <div class="checkbox-group-item">
      <input
        type="checkbox"
        id="${fieldId}"
        data-field="${fieldId}"
        ${checked ? 'checked' : ''}
        class="form-checkbox"
      >
      <label for="${fieldId}">${escapeHtml(label)}</label>
    </div>
  `;
}

/**
 * Render a radio button group
 * @param {string} fieldPath - Field path for data binding
 * @param {Array} options - Radio options with value and label
 * @param {string} selected - Currently selected value
 * @returns {string} HTML string
 */
function renderRadioButtonGroup(fieldPath, options, selected) {
  const id = fieldPath.replace(/\./g, '-');
  
  return options.map((opt, idx) => `
    <div class="radio-group-item">
      <input
        type="radio"
        id="${id}-${idx}"
        name="${fieldPath}"
        data-field="${fieldPath}"
        value="${escapeHtml(String(opt.value))}"
        ${String(opt.value) === String(selected) ? 'checked' : ''}
        class="form-radio"
      >
      <label for="${id}-${idx}">${escapeHtml(opt.label)}</label>
    </div>
  `).join('');
}

/**
 * Render an inspection row with i.O. / n.i.O. checkboxes
 * @param {string} fieldPath - Field path for data binding (e.g., 'besichtigung.auswahlBetriebsmittel')
 * @param {string} label - Row label
 * @param {Object} value - Object with {io: boolean, nio: boolean}
 * @returns {string} HTML string
 */
function renderInspectionRow(fieldPath, label, value = {}) {
  const id = fieldPath.replace(/\./g, '-');
  const ioChecked = value?.io ? 'checked' : '';
  const nioChecked = value?.nio ? 'checked' : '';
  
  return `
    <div class="inspection-row">
      <span class="inspection-label">${escapeHtml(label)}</span>
      <span class="inspection-io">
        <input
          type="checkbox"
          id="${id}-io"
          data-field="${fieldPath}.io"
          ${ioChecked}
          class="form-checkbox inspection-checkbox"
          aria-label="${escapeHtml(label)} - in Ordnung"
        >
      </span>
      <span class="inspection-nio">
        <input
          type="checkbox"
          id="${id}-nio"
          data-field="${fieldPath}.nio"
          ${nioChecked}
          class="form-checkbox inspection-checkbox"
          aria-label="${escapeHtml(label)} - nicht in Ordnung"
        >
      </span>
    </div>
  `;
}

// ============================================
// POSITION ROW RENDERING
// ============================================

// Phase type display labels
const PHASE_TYPE_LABELS = {
  'mono': '1P',
  'bi': '2P',
  'tri': '3P'
};

/**
 * Get phase type display label
 * @param {string} phaseType - Phase type ('mono', 'bi', 'tri')
 * @returns {string} Display label
 */
function getPhaseTypeLabel(phaseType) {
  return PHASE_TYPE_LABELS[phaseType] || PHASE_TYPE_LABELS['mono'];
}

/**
 * Render a single position row (Stromkreis)
 * Based on vorlage_protokoll.md - German interface
 * @param {Object} position - Position object
 * @param {number} index - Row index
 * @returns {string} HTML string
 */
function renderPositionRow(position, index) {
  const status = position.prüfergebnis?.status || 'nicht-geprüft';
  const phaseLabel = getPhaseTypeLabel(position.phaseType);
  const hasParent = position.parentCircuitId ? true : false;
  
  return `
    <tr class="position-row${hasParent ? ' child-circuit' : ''}" data-pos-nr="${escapeHtml(position.posNr)}">
      <td class="editable-cell" data-field="stromkreisNr">
        <input type="text" 
               value="${escapeHtml(position.stromkreisNr || '')}" 
               data-field="position.stromkreisNr"
               data-pos-nr="${escapeHtml(position.posNr)}"
               placeholder="01.01.0010"
               pattern="\\d{2}\\.\\d{2}\\.\\d{4}"
               class="table-input pos-nr-input">
      </td>
      <td class="editable-cell" data-field="zielbezeichnung">
        <input type="text" 
               value="${escapeHtml(position.zielbezeichnung || '')}" 
               data-field="position.zielbezeichnung"
               data-pos-nr="${escapeHtml(position.posNr)}"
               placeholder="Bezeichnung eingeben"
               class="table-input">
      </td>
      <td class="editable-cell" data-field="phaseType">
        <select data-field="position.phaseType" 
                data-pos-nr="${escapeHtml(position.posNr)}"
                class="table-select">
          <option value="mono" ${position.phaseType === 'mono' ? 'selected' : ''}>1-phasig</option>
          <option value="bi" ${position.phaseType === 'bi' ? 'selected' : ''}>2-phasig</option>
          <option value="tri" ${position.phaseType === 'tri' ? 'selected' : ''}>3-phasig</option>
        </select>
      </td>
      <td class="editable-cell" data-field="leitung.typ">
        <input type="text" 
               value="${escapeHtml(position.leitung?.typ || '')}" 
               data-field="position.leitung.typ"
               data-pos-nr="${escapeHtml(position.posNr)}"
               placeholder="NYM-J 3x1,5"
               class="table-input">
      </td>
      <td class="editable-cell" data-field="spannung.un">
        <input type="number" 
               value="${position.spannung?.un || ''}" 
               data-field="position.spannung.un"
               data-pos-nr="${escapeHtml(position.posNr)}"
               placeholder="230"
               min="0"
               max="1000"
               class="table-input number-input">
      </td>
      <td class="editable-cell" data-field="spannung.fn">
        <input type="number" 
               value="${position.spannung?.fn || ''}" 
               data-field="position.spannung.fn"
               data-pos-nr="${escapeHtml(position.posNr)}"
               placeholder="50"
               min="0"
               max="100"
               class="table-input number-input">
      </td>
      <td class="editable-cell" data-field="überstromschutz.art">
        <select data-field="position.überstromschutz.art" 
                data-pos-nr="${escapeHtml(position.posNr)}"
                class="table-select">
          <option value="">Auswählen</option>
          <option value="B" ${position.überstromschutz?.art === 'B' ? 'selected' : ''}>B</option>
          <option value="C" ${position.überstromschutz?.art === 'C' ? 'selected' : ''}>C</option>
          <option value="D" ${position.überstromschutz?.art === 'D' ? 'selected' : ''}>D</option>
          <option value="K" ${position.überstromschutz?.art === 'K' ? 'selected' : ''}>K</option>
        </select>
      </td>
      <td class="editable-cell" data-field="überstromschutz.inNennstrom">
        <input type="number" 
               value="${position.überstromschutz?.inNennstrom || ''}" 
               data-field="position.überstromschutz.inNennstrom"
               data-pos-nr="${escapeHtml(position.posNr)}"
               placeholder="16"
               min="0"
               max="1000"
               class="table-input number-input">
      </td>
      <td class="editable-cell" data-field="messwerte.riso">
        <input type="number" 
               value="${position.messwerte?.riso || ''}" 
               data-field="position.messwerte.riso"
               data-pos-nr="${escapeHtml(position.posNr)}"
               placeholder="500"
               min="0"
               step="0.1"
               class="table-input number-input">
      </td>
      <td class="status-cell">
        <select data-field="position.prüfergebnis.status" 
                data-pos-nr="${escapeHtml(position.posNr)}"
                class="table-select status-select">
          <option value="nicht-geprüft" ${status === 'nicht-geprüft' ? 'selected' : ''}>Nicht geprüft</option>
          <option value="i.O." ${status === 'i.O.' ? 'selected' : ''}>i.O.</option>
          <option value="n.i.O." ${status === 'n.i.O.' ? 'selected' : ''}>n.i.O.</option>
          <option value="nicht-zugänglich" ${status === 'nicht-zugänglich' ? 'selected' : ''}>Nicht zugänglich</option>
        </select>
      </td>
      <td class="position-actions">
        ${hasParent ? `<button type="button" class="btn-icon btn-tree" data-action="view-parent" data-pos-nr="${escapeHtml(position.posNr)}" title="Zum Vater-Stromkreis" aria-label="Vater-Stromkreis anzeigen">↑</button>` : ''}
        <button type="button" class="btn-icon btn-success" data-action="add-child-position" data-pos-nr="${escapeHtml(position.posNr)}" title="Unterkreis hinzufügen" aria-label="Unterkreis hinzufügen">+</button>
        <button type="button" class="btn-icon btn-danger" data-action="delete-position" data-pos-nr="${escapeHtml(position.posNr)}" title="Löschen" aria-label="Position löschen">✕</button>
      </td>
    </tr>
  `;
}

/**
 * Add new position row to table
 * @param {Object} position - Position object
 * @returns {void}
 */
export function addPositionRow(position) {
  const tbody = document.getElementById('positionsTableBody');
  if (!tbody) return;

  // Use table wrapper to properly parse TR elements (TR is not valid inside a div)
  const tempTable = document.createElement('table');
  const tempTbody = document.createElement('tbody');
  tempTable.appendChild(tempTbody);
  tempTbody.innerHTML = renderPositionRow(position, tbody.children.length);
  
  const newRow = tempTbody.querySelector('tr');
  if (newRow) {
    tbody.appendChild(newRow);
    attachPositionListeners();
  }
}

/**
 * Remove position row from table
 * @param {string} posNr - Position number
 * @returns {void}
 */
export function removePositionRow(posNr) {
  const row = document.querySelector(`tr[data-pos-nr="${posNr}"]`);
  if (row) {
    row.remove();
  }
}

/**
 * Update position row
 * @param {string} posNr - Position number
 * @param {Object} position - Updated position object
 * @returns {void}
 */
export function updatePositionRow(posNr, position) {
  const row = document.querySelector(`tr[data-pos-nr="${posNr}"]`);
  if (!row) return;

  const status = position.prüfergebnis?.status || 'nicht-geprüft';
  const phaseLabel = getPhaseTypeLabel(position.phaseType);
  const hasParent = position.parentCircuitId ? true : false;
  const cells = row.querySelectorAll('td');
  
  // Update row class for child circuits
  row.classList.toggle('child-circuit', hasParent);
  
  // Expected number of columns in the positions table
  // Pos.Nr., Nr., Zielbezeichnung, Phase, Leitung/Kabel, Un, fn, Überstrom-Schutz, In, Riso, Status, Aktionen
  const POSITIONS_TABLE_COLUMN_COUNT = 12;
  
  if (cells.length >= POSITIONS_TABLE_COLUMN_COUNT) {
    // Column indices: Pos.Nr. (0), Nr. (1), Zielbezeichnung (2), Phase (3), Leitung/Kabel (4), 
    // Un (5), fn (6), Überstrom-Schutz (7), In (8), Riso (9), Status (10), Aktionen (11)
    cells[1].textContent = position.stromkreisNr || '-';
    cells[2].textContent = position.zielbezeichnung || '-';
    
    // Update phase badge
    const phaseBadge = cells[3].querySelector('.phase-badge');
    if (phaseBadge) {
      phaseBadge.className = `phase-badge phase-${position.phaseType || 'mono'}`;
      phaseBadge.textContent = phaseLabel;
    }
    
    cells[4].textContent = position.leitung?.typ || '-';
    cells[5].textContent = position.spannung?.un || '-';
    cells[6].textContent = position.spannung?.fn || '-';
    cells[7].textContent = position.überstromschutz?.art || '-';
    cells[8].textContent = position.überstromschutz?.inNennstrom || '-';
    cells[9].textContent = position.messwerte?.riso || '-';
    
    const statusBadge = cells[10].querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.className = `status-badge status-${status}`;
      statusBadge.textContent = status;
    }
  }
}

// ============================================
// HELPER RENDERING FUNCTIONS
// ============================================

/**
 * Render progress indicator with German labels
 * @param {string} currentStep - Current active step
 * @returns {string} HTML string
 */
function renderProgressIndicator(currentStep) {
  return `
    <nav class="progress-indicator" aria-label="Formular-Fortschritt">
      ${STEPS.map((step, idx) => {
        const isActive = step === currentStep;
        const isCompleted = STEPS.indexOf(step) < STEPS.indexOf(currentStep);
        const stepLabel = STEP_LABELS[step] || step;
        
        return `
          <div class="progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
               data-step="${step}"
               role="button"
               tabindex="0"
               aria-current="${isActive ? 'step' : 'false'}"
               aria-label="${stepLabel}${isCompleted ? ' (abgeschlossen)' : isActive ? ' (aktuell)' : ''}">
            <span class="step-number">${idx + 1}</span>
            <span class="step-label">${stepLabel}</span>
          </div>
        `;
      }).join('')}
    </nav>
  `;
}

/**
 * Update progress indicator
 * @param {string} currentStep - Current active step
 * @returns {void}
 */
export function updateProgressIndicator(currentStep) {
  document.querySelectorAll('.progress-step').forEach(stepEl => {
    const stepName = stepEl.getAttribute('data-step');
    stepEl.classList.remove('active', 'completed');
    stepEl.setAttribute('aria-current', 'false');
    
    if (stepName === currentStep) {
      stepEl.classList.add('active');
      stepEl.setAttribute('aria-current', 'step');
    } else if (STEPS.indexOf(stepName) < STEPS.indexOf(currentStep)) {
      stepEl.classList.add('completed');
    }
  });
}

/**
 * Render form navigation buttons (German labels)
 * @param {string} currentStep - Current step
 * @returns {string} HTML string
 */
function renderFormNavigation(currentStep) {
  const currentIndex = STEPS.indexOf(currentStep);
  const showPrevious = currentIndex > 0;
  const showNext = currentIndex < STEPS.length - 1;
  const showExport = currentIndex === STEPS.length - 1;

  return `
    <div class="form-navigation">
      ${showPrevious ? '<button type="button" class="btn btn-secondary" data-action="previous-step">← Zurück</button>' : '<div></div>'}
      <div></div>
      ${showNext ? '<button type="button" class="btn btn-primary" data-action="next-step">Weiter →</button>' : ''}
      ${showExport ? '<button type="button" class="btn btn-success" data-action="export-both">Exportieren →</button>' : ''}
    </div>
  `;
}

// ============================================
// ERROR DISPLAY
// ============================================

/**
 * Display field error
 * @param {string} fieldPath - Field path
 * @param {string} errorMessage - Error message
 * @returns {void}
 */
export function displayFieldError(fieldPath, errorMessage) {
  const id = fieldPath.replace(/\./g, '-');
  const errorDiv = document.getElementById(`error-${id}`);
  const field = document.querySelector(`[data-field="${fieldPath}"]`);

  if (errorDiv) {
    errorDiv.textContent = errorMessage;
    errorDiv.style.display = 'block';
  }

  if (field) {
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', `error-${id}`);
  }
}

/**
 * Clear field error
 * @param {string} fieldPath - Field path
 * @returns {void}
 */
export function clearFieldError(fieldPath) {
  const id = fieldPath.replace(/\./g, '-');
  const errorDiv = document.getElementById(`error-${id}`);
  const field = document.querySelector(`[data-field="${fieldPath}"]`);

  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }

  if (field) {
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }
}

/**
 * Clear all field errors
 * @returns {void}
 */
export function clearAllFieldErrors() {
  document.querySelectorAll('.field-error').forEach(errorDiv => {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  });

  document.querySelectorAll('.form-control.error').forEach(field => {
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  });
}

// ============================================
// MESSAGE DISPLAY
// ============================================

/**
 * Display a message to the user
 * @param {string} type - Message type ('success', 'error', 'info', 'warning')
 * @param {string} message - Message text
 * @returns {void}
 */
export function displayMessage(type, message) {
  let container = document.getElementById(MESSAGE_CONTAINER_ID);
  
  // Create container if it doesn't exist
  if (!container) {
    container = document.createElement('div');
    container.id = MESSAGE_CONTAINER_ID;
    container.className = 'message-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const div = document.createElement('div');
  div.className = `message message-${type}`;
  div.setAttribute('role', type === 'error' ? 'alert' : 'status');
  
  div.innerHTML = `
    <span class="message-text">${escapeHtml(message)}</span>
    <button type="button" class="message-close" aria-label="Close message">&times;</button>
  `;

  // Add close handler
  div.querySelector('.message-close').addEventListener('click', () => {
    div.remove();
  });

  container.appendChild(div);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (div.parentNode) {
      div.remove();
    }
  }, 5000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  // Escape HTML entities including quotes for safe use in attributes
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return '';
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
 * Attach field event listeners
 * @returns {void}
 */
function attachFieldListeners() {
  const form = document.querySelector('.protokoll-form');
  if (!form) return;

  // Note: Input and change events are handled by event delegation in protokoll-handlers.js
  // This function now only handles navigation and action buttons

  // Navigation button clicks
  form.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    
    switch (action) {
      case 'previous-step':
        handlers.handlePreviousStep();
        break;
      case 'next-step':
        handlers.handleNextStep();
        break;
      case 'add-position':
        handlers.handleAddPosition();
        break;
      case 'export':
      case 'export-both':
        handlers.handleExport();
        break;
    }
  });

  // Progress step clicks
  document.querySelectorAll('.progress-step').forEach(step => {
    step.addEventListener('click', () => {
      const stepName = step.getAttribute('data-step');
      handlers.handleGoToStep(stepName);
    });

    step.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const stepName = step.getAttribute('data-step');
        handlers.handleGoToStep(stepName);
      }
    });
  });
}

/**
 * Attach position-specific event listeners using event delegation
 * @returns {void}
 */
function attachPositionListeners() {
  const tbody = document.getElementById('positionsTableBody');
  if (!tbody) return;

  // Remove any existing delegated listeners
  if (tbody._positionClickHandler) {
    tbody.removeEventListener('click', tbody._positionClickHandler);
  }
  if (tbody._positionInputHandler) {
    tbody.removeEventListener('input', tbody._positionInputHandler);
  }
  if (tbody._positionChangeHandler) {
    tbody.removeEventListener('change', tbody._positionChangeHandler);
  }

  // Create click handler for buttons
  tbody._positionClickHandler = function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const posNr = btn.getAttribute('data-pos-nr');

    if (!posNr) return;

    e.preventDefault();

    switch (action) {
      case 'delete-position':
        handlers.handleDeletePosition(posNr);
        break;
      case 'add-child-position':
        handlers.handleAddChildPosition(posNr);
        break;
      case 'view-parent':
        // Scroll to parent position or highlight it
        const parentRow = document.querySelector(`tr[data-pos-nr="${posNr}"]`);
        if (parentRow) {
          parentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          parentRow.classList.add('highlight');
          setTimeout(() => parentRow.classList.remove('highlight'), 2000);
        }
        break;
    }
  };

  // Create input handler for real-time updates
  tbody._positionInputHandler = function(e) {
    const input = e.target;
    const fieldPath = input.getAttribute('data-field');
    const posNr = input.getAttribute('data-pos-nr');

    if (!fieldPath || !posNr) return;

    const value = input.type === 'number' ? parseFloat(input.value) || '' : input.value;
    handlers.handlePositionChange(posNr, fieldPath, value);
  };

  // Create change handler for final validation
  tbody._positionChangeHandler = function(e) {
    const input = e.target;
    const fieldPath = input.getAttribute('data-field');
    const posNr = input.getAttribute('data-pos-nr');

    if (!fieldPath || !posNr) return;

    const value = input.type === 'number' ? parseFloat(input.value) || '' : input.value;
    handlers.handlePositionChange(posNr, fieldPath, value);
  };

  // Attach all listeners
  tbody.addEventListener('click', tbody._positionClickHandler);
  tbody.addEventListener('input', tbody._positionInputHandler);
  tbody.addEventListener('change', tbody._positionChangeHandler);
}

/**
 * Attach export button listeners
 * @returns {void}
 */
function attachExportListeners() {
  document.querySelectorAll('[data-action^="export-"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handlers.handleExport();
    });
  });

  // Navigation buttons
  attachFieldListeners();
}

/**
 * Attach device select listener for Messgerät dropdown
 * @returns {void}
 */
function attachDeviceSelectListener() {
  const deviceSelect = document.getElementById('messgeraet-select');
  if (!deviceSelect) return;

  deviceSelect.addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;

    try {
      const deviceDataAttr = selectedOption.getAttribute('data-device');
      if (!deviceDataAttr) return;

      const deviceData = JSON.parse(deviceDataAttr);
      
      // Populate the form fields with device data
      // Note: In the protokoll form:
      // - fabrikat = manufacturer/brand (e.g., "Fluke")
      // - typ = device model/type (e.g., "1654b")
      const fabrikatField = document.querySelector('[data-field="messgeräte.fabrikat"]');
      const typField = document.querySelector('[data-field="messgeräte.typ"]');
      const kalibField = document.querySelector('[data-field="messgeräte.nächsteKalibrierung"]');
      const identField = document.querySelector('[data-field="messgeräte.identNr"]');

      // Use fabrikat if available, otherwise fall back to name
      const fabrikatValue = deviceData.fabrikat || deviceData.name || '';
      if (fabrikatField && fabrikatValue) {
        fabrikatField.value = fabrikatValue;
        handlers.handleMetadataChange('messgeräte.fabrikat', fabrikatValue);
      }
      if (typField && deviceData.type) {
        typField.value = deviceData.type;
        handlers.handleMetadataChange('messgeräte.typ', deviceData.type);
      }
      if (kalibField && deviceData.calibrationDate) {
        // Format date for display (DD.MM.YY)
        const date = new Date(deviceData.calibrationDate);
        const formatted = date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        });
        kalibField.value = formatted;
        handlers.handleMetadataChange('messgeräte.nächsteKalibrierung', formatted);
      }
      if (identField && deviceData.identNr) {
        identField.value = deviceData.identNr;
        handlers.handleMetadataChange('messgeräte.identNr', deviceData.identNr);
      }

      // Show success message
      displayMessage('success', `Messgerät "${deviceData.name}" ausgewählt`);
    } catch (error) {
      console.error('Error populating device data:', error);
    }
  });
}

console.log('✓ Protokoll Renderer module loaded');
