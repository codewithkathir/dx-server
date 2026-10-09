import {
  addDaysIso,
  calculateTotals,
  calculateVat,
  deriveSettlementStatus,
  filsToDecimalString,
  fromFils,
  hasAtMostTwoDecimals,
  isOverdue,
  toFils,
  todayIso,
} from "../../../src/shared/utils/money.util";

describe("money.util", () => {
  describe("toFils", () => {
    it.each([
      ["250.50", 25050],
      ["250.5", 25050],
      ["0.01", 1],
      ["1000", 100000],
      ["-12.30", -1230],
      [0.1, 10],
      [0.29, 29],
      [1234.56, 123456],
    ])("converts %p to %p fils", (input, expected) => {
      expect(toFils(input)).toBe(expected);
    });

    it("avoids float drift (0.1 + 0.2)", () => {
      expect(toFils(0.1) + toFils(0.2)).toBe(toFils("0.30"));
    });

    it.each(["1.234", "abc", "", "1,000.00"])("rejects %p", (input) => {
      expect(() => toFils(input)).toThrow("Invalid money amount");
    });

    it("rejects numbers with more than 2 decimals", () => {
      expect(() => toFils(1.005)).toThrow("Invalid money amount");
    });
  });

  it("formats fils back to numbers and DECIMAL strings", () => {
    expect(fromFils(25050)).toBe(250.5);
    expect(filsToDecimalString(25050)).toBe("250.50");
    expect(filsToDecimalString(7)).toBe("0.07");
    expect(filsToDecimalString(-1230)).toBe("-12.30");
  });

  it("detects at most two decimals", () => {
    expect(hasAtMostTwoDecimals(10.25)).toBe(true);
    expect(hasAtMostTwoDecimals(10)).toBe(true);
    expect(hasAtMostTwoDecimals(10.255)).toBe(false);
  });

  describe("VAT", () => {
    it("rounds half-up to the nearest fils", () => {
      expect(calculateVat(toFils("99.99"), 5)).toBe(500); // 4.9995 → 5.00
      expect(calculateVat(toFils("10.10"), 5)).toBe(51); // 0.505 → 0.51
      expect(calculateVat(toFils("10.09"), 5)).toBe(50); // 0.5045 → 0.50
    });

    it("is zero for zero-rated documents", () => {
      expect(calculateVat(toFils("1500"), 0)).toBe(0);
    });

    it("totals subtotal + VAT", () => {
      expect(calculateTotals(toFils("1000"), 5)).toEqual({ subtotal: 100000, vat: 5000, total: 105000 });
    });
  });

  describe("deriveSettlementStatus", () => {
    it.each([
      ["open", 10000, 0, "open"],
      ["open", 10000, 2500, "partially_paid"],
      ["partially_paid", 10000, 10000, "paid"],
      ["paid", 10000, 4000, "partially_paid"],
      ["paid", 10000, 0, "open"],
      ["draft", 10000, 0, "draft"],
      ["cancelled", 10000, 0, "cancelled"],
    ] as const)("%s, total %d, settled %d → %s", (current, total, settled, expected) => {
      expect(deriveSettlementStatus(current, total, settled, "open")).toBe(expected);
    });

    it("uses 'sent' as the unpaid status for invoices", () => {
      expect(deriveSettlementStatus("partially_paid", 10000, 0, "sent")).toBe("sent");
    });
  });

  describe("dates", () => {
    it("uses the local date, not UTC", () => {
      expect(todayIso(new Date(2026, 9, 9, 0, 30))).toBe("2026-10-09");
    });

    it("adds days across month and year ends", () => {
      expect(addDaysIso("2026-10-28", 7)).toBe("2026-11-04");
      expect(addDaysIso("2026-12-30", 3)).toBe("2027-01-02");
    });
  });

  describe("isOverdue", () => {
    const today = "2026-10-09";
    it("is overdue when past due with a balance", () => {
      expect(isOverdue("open", "2026-10-08", 100, today)).toBe(true);
      expect(isOverdue("partially_paid", "2026-09-01", 1, today)).toBe(true);
    });
    it("is not overdue on the due date itself", () => {
      expect(isOverdue("open", "2026-10-09", 100, today)).toBe(false);
    });
    it("is not overdue when settled, draft or cancelled", () => {
      expect(isOverdue("paid", "2026-01-01", 0, today)).toBe(false);
      expect(isOverdue("draft", "2026-01-01", 100, today)).toBe(false);
      expect(isOverdue("cancelled", "2026-01-01", 100, today)).toBe(false);
    });
  });
});
