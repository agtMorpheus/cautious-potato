/**
 * Unit Tests for HR Utils (hrUtils.js)
 */

import {
  formatDateDE,
  formatTimeDE,
  getWeekNumber,
  getWeekStart,
  getDayName,
  calculateWorkingDays,
  decimalToHoursMinutes,
  hoursMinutesToDecimal,
  calculateHoursWorked,
  calculatePoints,
  validateEmployee,
  validateAttendance,
  validateVacation,
  isValidEmail,
  isValidDate,
  isValidTime,
  isValidGermanIBAN,
  isValidTaxId,
  formatEmployeeName,
  formatHours,
  formatCurrency,
  getStatusClass,
  getStatusText,
  generateEmployeeId,
  generateAttendanceId,
  generateScheduleId,
  generateVacationId,
  groupAttendanceByEmployee,
  calculateTotalHours,
  getAttendanceSummary,
  sortEmployees
} from '../../js/modules/hr/hrUtils.js';

describe('HR Utils (hrUtils.js)', () => {

  describe('Date & Time Utilities', () => {
    test('formatDateDE formats date correctly', () => {
      expect(formatDateDE('2023-12-10')).toBe('10.12.2023');
      expect(formatDateDE(new Date('2023-01-05'))).toBe('05.01.2023');
      expect(formatDateDE(null)).toBe('');
    });

    test('formatTimeDE formats time', () => {
      expect(formatTimeDE('13:45')).toBe('13:45');
      expect(formatTimeDE(null)).toBe('');
    });

    test('getWeekNumber returns correct week', () => {
      expect(getWeekNumber(new Date('2023-01-04'))).toBe(1); // First week of 2023
      expect(getWeekNumber(new Date('2023-12-28'))).toBe(52);
    });

    test('getWeekStart returns Monday', () => {
      const wednesday = new Date('2023-06-14');
      const monday = getWeekStart(wednesday);
      expect(monday.getDay()).toBe(1); // Monday is 1
      expect(monday.getDate()).toBe(12);
    });

    test('getWeekStart handles Sunday', () => {
      const sunday = new Date('2023-06-18');
      const monday = getWeekStart(sunday);
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(12);
    });

    test('getDayName returns German day name', () => {
      expect(getDayName('2023-06-12')).toBe('Montag');
      expect(getDayName(new Date('2023-06-18'))).toBe('Sonntag');
    });

    test('calculateWorkingDays excludes weekends', () => {
      // Mon 12 to Fri 16 -> 5 days
      expect(calculateWorkingDays('2023-06-12', '2023-06-16')).toBe(5);

      // Fri 16 to Mon 19 -> 2 days (Fri, Mon)
      expect(calculateWorkingDays('2023-06-16', '2023-06-19')).toBe(2);

      // Sat 17 to Sun 18 -> 0 days
      expect(calculateWorkingDays('2023-06-17', '2023-06-18')).toBe(0);
    });
  });

  describe('Time Calculation Utilities', () => {
    test('decimalToHoursMinutes', () => {
      expect(decimalToHoursMinutes(8.5)).toEqual({ hours: 8, minutes: 30 });
      expect(decimalToHoursMinutes(8.25)).toEqual({ hours: 8, minutes: 15 });
    });

    test('hoursMinutesToDecimal', () => {
      expect(hoursMinutesToDecimal(8, 30)).toBe(8.5);
      expect(hoursMinutesToDecimal(8, 15)).toBe(8.25);
    });

    test('calculateHoursWorked', () => {
      expect(calculateHoursWorked('08:00', '16:30', 30)).toBe(8);
      expect(calculateHoursWorked('09:00', '17:00')).toBe(8);
      expect(calculateHoursWorked('08:00', '12:00')).toBe(4);
      expect(calculateHoursWorked('', '12:00')).toBe(0);
    });

    test('calculatePoints', () => {
      expect(calculatePoints(8)).toBe(64);
      expect(calculatePoints(8, 10)).toBe(80);
    });
  });

  describe('Validation Utilities', () => {
    describe('validateEmployee', () => {
      test('validates correct employee', () => {
        const emp = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          hoursPerWeek: 40,
          startDate: '2023-01-01'
        };
        const result = validateEmployee(emp);
        expect(result.valid).toBe(true);
      });

      test('detects missing fields', () => {
        const emp = { firstName: '' };
        const result = validateEmployee(emp);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Vorname ist erforderlich');
      });

      test('validates email', () => {
        const emp = {
            firstName: 'A', lastName: 'B',
            email: 'invalid'
        };
        const result = validateEmployee(emp);
        expect(result.valid).toBe(false);
      });

      test('validates hours', () => {
          const emp = {
              firstName: 'A', lastName: 'B', email: 'a@b.c',
              hoursPerWeek: 100
          };
          const result = validateEmployee(emp);
          expect(result.valid).toBe(false);
      });
    });

    describe('validateAttendance', () => {
      test('validates correct attendance', () => {
        const att = {
          employeeId: '1',
          date: '2023-01-01'
        };
        const result = validateAttendance(att);
        expect(result.valid).toBe(true);
      });

      test('validates times', () => {
        const att = {
          employeeId: '1',
          date: '2023-01-01',
          entryTime: '08:00',
          exitTime: '07:00' // Exit before entry
        };
        const result = validateAttendance(att);
        expect(result.valid).toBe(false);
      });
    });

    describe('validateVacation', () => {
      test('validates correct vacation', () => {
        const vac = {
          employeeId: '1',
          startDate: '2023-01-01',
          endDate: '2023-01-05'
        };
        const result = validateVacation(vac);
        expect(result.valid).toBe(true);
      });

      test('validates dates', () => {
        const vac = {
          employeeId: '1',
          startDate: '2023-01-05',
          endDate: '2023-01-01' // End before start
        };
        const result = validateVacation(vac);
        expect(result.valid).toBe(false);
      });
    });

    test('isValidEmail', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
    });

    test('isValidDate', () => {
      expect(isValidDate('2023-01-01')).toBe(true);
      expect(isValidDate('invalid')).toBe(false);
    });

    test('isValidTime', () => {
      expect(isValidTime('13:45')).toBe(true);
      expect(isValidTime('25:00')).toBe(false);
    });

    test('isValidGermanIBAN', () => {
        expect(isValidGermanIBAN(null)).toBe(false);
        expect(isValidGermanIBAN('DE12345678901234567890')).toBe(true); // 22 chars
        expect(isValidGermanIBAN('DE12')).toBe(false);
    });

    test('isValidTaxId', () => {
        expect(isValidTaxId(null)).toBe(false);
        expect(isValidTaxId('12345678901')).toBe(true); // 11 digits
        expect(isValidTaxId('123')).toBe(false);
    });
  });

  describe('Formatting Utilities', () => {
    test('formatEmployeeName', () => {
      expect(formatEmployeeName({ firstName: 'John', lastName: 'Doe' })).toBe('Doe, John');
      expect(formatEmployeeName(null)).toBe('');
    });

    test('formatHours', () => {
      expect(formatHours(8.5)).toBe('8h 30m');
      expect(formatHours(8)).toBe('8h');
    });

    test('formatCurrency', () => {
      // Intl format can vary by environment (space vs non-breaking space), just check parts
      const result = formatCurrency(1234.56);
      expect(result).toContain('1.234,56');
      expect(result).toContain('€');
    });

    test('getStatusClass', () => {
      expect(getStatusClass('approved')).toBe('hr-status-approved');
      expect(getStatusClass('unknown')).toBe('hr-status-default');
    });

    test('getStatusText', () => {
      expect(getStatusText('approved')).toBe('Genehmigt');
      expect(getStatusText('unknown')).toBe('unknown');
    });
  });

  describe('ID Generation', () => {
    test('generateEmployeeId', () => {
      expect(generateEmployeeId()).toMatch(/^EMP/);
    });

    test('generators return strings', () => {
        expect(generateAttendanceId()).toMatch(/^ATT/);
        expect(generateScheduleId()).toMatch(/^SCHED/);
        expect(generateVacationId()).toMatch(/^VAC/);
    });
  });

  describe('Data Transformation', () => {
    test('groupAttendanceByEmployee', () => {
      const data = [
        { employeeId: '1' },
        { employeeId: '1' },
        { employeeId: '2' }
      ];
      const result = groupAttendanceByEmployee(data);
      expect(result['1'].length).toBe(2);
      expect(result['2'].length).toBe(1);
    });

    test('calculateTotalHours', () => {
      const data = [
        { hoursWorked: 8 },
        { hoursWorked: 4 }
      ];
      expect(calculateTotalHours(data)).toBe(12);
    });

    test('getAttendanceSummary', () => {
      const data = [
        { status: 'present', hoursWorked: 8 },
        { status: 'sick_leave', hoursWorked: 0 },
        { status: 'home_office', hoursWorked: 8 }
      ];
      const summary = getAttendanceSummary(data);
      expect(summary.totalDays).toBe(3);
      expect(summary.presentDays).toBe(2); // present + home_office
      expect(summary.sickDays).toBe(1);
      expect(summary.totalHours).toBe(16);
    });

    test('sortEmployees', () => {
      const employees = [
        { lastName: 'Doe' },
        { lastName: 'Smith' },
        { lastName: 'Adams' }
      ];
      const sorted = sortEmployees(employees);
      expect(sorted[0].lastName).toBe('Adams');
      expect(sorted[2].lastName).toBe('Smith');

      const desc = sortEmployees(employees, 'lastName', 'desc');
      expect(desc[0].lastName).toBe('Smith');
    });
  });
});
