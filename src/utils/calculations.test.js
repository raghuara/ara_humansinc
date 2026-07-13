// Unit tests for the pure payroll calculation helpers. These functions decide
// real money (OT pay, advance recovery schedules, employee IDs), so they get
// their own fast, dependency-free tests.
import { otPayFor } from '../redux/slices/overtimeSlice';
import { nextEmployeeCode, sanitizePrefix } from '../redux/slices/employeesSlice';
import { advanceMonths } from '../redux/slices/advancesSlice';
import { inr, initialsFromName, paletteColor, PALETTE } from './format';

const OT_SLABS = [
    { id: 'a', fromHr: 0, toHr: 2, payType: 'perhour', amount: 150 },
    { id: 'b', fromHr: 2, toHr: 6, payType: 'perhour', amount: 250 },
    { id: 'c', fromHr: 6, toHr: null, payType: 'flat', amount: 2000 },
];

describe('otPayFor', () => {
    test('per-hour band multiplies rate by hours', () => {
        expect(otPayFor(1, OT_SLABS)).toEqual({ slab: OT_SLABS[0], pay: 150 });
        expect(otPayFor(2.5, OT_SLABS).pay).toBe(625);
    });
    test('flat band pays a single lump sum regardless of hours', () => {
        expect(otPayFor(8, OT_SLABS).pay).toBe(2000);
        expect(otPayFor(11, OT_SLABS).pay).toBe(2000);
    });
    test('boundary hours pick the correct band', () => {
        expect(otPayFor(2, OT_SLABS).slab.id).toBe('b'); // 2 belongs to [2,6)
        expect(otPayFor(6, OT_SLABS).slab.id).toBe('c'); // 6 belongs to [6,∞)
    });
    test('no matching slab yields zero pay', () => {
        expect(otPayFor(5, [{ id: 'x', fromHr: 6, toHr: null, payType: 'flat', amount: 999 }]))
            .toEqual({ slab: null, pay: 0 });
    });
});

describe('nextEmployeeCode', () => {
    test('first employee of a prefix starts at 001', () => {
        expect(nextEmployeeCode([], 'ARA')).toBe('ARA-001');
    });
    test('increments the max existing number for that prefix', () => {
        expect(nextEmployeeCode([{ employeeId: 'ARA-001' }, { employeeId: 'ARA-002' }], 'ARA')).toBe('ARA-003');
    });
    test('numbering is per-prefix', () => {
        expect(nextEmployeeCode([{ employeeId: 'EMP-050' }], 'ARA')).toBe('ARA-001');
    });
    test('continues legacy long numbers for the same prefix', () => {
        expect(nextEmployeeCode([{ employeeId: 'EMP-4527' }], 'EMP')).toBe('EMP-4528');
    });
});

describe('sanitizePrefix', () => {
    test('keeps letters only, uppercased, capped at 5', () => {
        expect(sanitizePrefix('ara123')).toBe('ARA');
        expect(sanitizePrefix('abcdefgh')).toBe('ABCDE');
        expect(sanitizePrefix('  a-b_c ')).toBe('ABC');
        expect(sanitizePrefix('')).toBe('');
    });
});

describe('advanceMonths', () => {
    test('one-time plan is always a single month', () => {
        expect(advanceMonths({ plan: 'onetime', amount: 20000 })).toBe(1);
    });
    test('installment plan rounds up to whole months', () => {
        expect(advanceMonths({ plan: 'installment', amount: 20000, monthlyAmount: 5000 })).toBe(4);
        expect(advanceMonths({ plan: 'installment', amount: 20000, monthlyAmount: 7000 })).toBe(3);
    });
});

describe('format helpers', () => {
    test('inr formats with Indian grouping', () => {
        expect(inr(20000)).toBe('₹20,000');
        expect(inr(0)).toBe('₹0');
        expect(inr(null)).toBe('₹0');
    });
    test('initialsFromName takes up to two initials', () => {
        expect(initialsFromName('Karthik R')).toBe('KR');
        expect(initialsFromName('Anitha')).toBe('A');
    });
    test('paletteColor is deterministic and within the palette', () => {
        expect(paletteColor('A')).toBe(paletteColor('A'));
        expect(PALETTE).toContain(paletteColor('Karthik'));
    });
});
