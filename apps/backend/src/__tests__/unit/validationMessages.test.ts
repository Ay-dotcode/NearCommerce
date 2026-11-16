import {
  CreateProductSchema,
  CreateStoreSchema,
  LoginSchema,
} from "@nearcommerce/api";

const messages = (
  schema: { safeParse: (v: unknown) => any },
  input: unknown,
) => {
  const result = schema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map(
          (i: { path: PropertyKey[]; message: string }) => [
            i.path.map(String).join("."),
            i.message,
          ],
        ),
      );
};

describe("validation messages", () => {
  it('says "Required" for missing fields, as before the zod 4 upgrade', () => {
    expect(messages(LoginSchema, {})).toEqual({
      email: "Required",
      password: "Required",
    });
    expect(messages(CreateStoreSchema, {})).toMatchObject({
      name: "Required",
      address: "Required",
    });
  });

  it("keeps messages that a schema defines itself", () => {
    expect(
      messages(CreateProductSchema, { name: "Tea", price: "abc" }),
    ).toMatchObject({
      price: "Price must be a number",
    });
  });
});
