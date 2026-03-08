/** Pagination metadata */
export type PageMeta = {
  /** 1-based current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
};

/** Paginated response wrapper */
export type Paginated<T> = {
  items: T[];
  meta: PageMeta;
};
