import { z } from "zod";

// zod 4 words a missing value as "Invalid input: expected string, received undefined", while
// zod 3 (and so this API until now) said "Required". Keep the short, user-friendly wording.
// Messages set on a schema itself (for example "Price must be a number") still win over this.
z.config({
  customError: (issue) => {
    if (issue.code === "invalid_type" && issue.input === undefined)
      return "Required";
    return undefined;
  },
});
