import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    email: z.email("Valid Email Id is a required field"),
    name: z
      .string()
      .min(3, "Name is a required field with atleast 3 characters"),
    password: z.string().min(8, "Password must be atleast 8 character long"),
  }),
});

export const signinSchema = z.object({
  body: z.object({
    email: z.email("Valid Email Id is a required field"),
    password: z.string().min(8, "Password must be atleast 8 character long"),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

export type SignupBody = z.infer<typeof signupSchema>["body"];
export type SigninBody = z.infer<typeof signinSchema>["body"];
export type RefreshBody = z.infer<typeof refreshSchema>["body"];
