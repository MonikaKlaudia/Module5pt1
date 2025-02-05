import { sql } from "@vercel/postgres"; // Ensure this is your DB connection
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Define State Type (Remove duplicate)
export type State = {
  message: string | null;
  errors?: Record<string, string[]>;
};

// Define Zod Schema for Validation
const CreateInvoice = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, "Amount must be greater than zero")
  ),
  status: z.enum(["pending", "paid"]),
});

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: Number(formData.get("amount")), // Ensure proper number conversion
    status: formData.get("status"),
  });

  // If validation fails, return errors early
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Math.round(amount * 100); // Convert to cents safely
  const date = new Date().toISOString().split("T")[0];

  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error("Database Error:", error);
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
