import {
  buildPaginationMeta,
  getOffset,
} from "../../../src/shared/utils/pagination.util";

describe("pagination.util", () => {
  describe("buildPaginationMeta", () => {
    it("calculates total pages correctly", () => {
      expect(buildPaginationMeta(1, 10, 100)).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
    });

    it("returns zero total pages when total is zero", () => {
      expect(buildPaginationMeta(1, 10, 0).totalPages).toBe(0);
    });
  });

  describe("getOffset", () => {
    it("returns correct offset for page 2", () => {
      expect(getOffset(2, 10)).toBe(10);
    });

    it("returns zero for first page", () => {
      expect(getOffset(1, 10)).toBe(0);
    });
  });
});
