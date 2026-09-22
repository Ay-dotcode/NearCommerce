import {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

export const Table = ({
  className = "",
  ...props
}: TableHTMLAttributes<HTMLTableElement>) => (
  <table className={`w-full text-left text-sm ${className}`} {...props} />
);
export const TableHeader = ({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={`border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 ${className}`}
    {...props}
  />
);
export const TableBody = ({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={className} {...props} />
);
export const TableRow = ({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`border-b border-slate-800/80 ${className}`} {...props} />
);
export const TableHead = ({
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`px-4 py-3 font-medium ${className}`} {...props} />
);
export const TableCell = ({
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-4 py-3 ${className}`} {...props} />
);
