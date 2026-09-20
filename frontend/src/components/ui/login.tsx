"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

// Validation schema for the form
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  rememberMe: z.boolean().default(false).optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export interface AuthFormSplitScreenProps {
  logo: React.ReactNode;
  title: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  onSubmit: (data: FormValues) => Promise<void>;
  forgotPasswordHref?: string;
  createAccountHref?: string;
  onCreateAccountClick?: () => void;
  error?: string | null;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * A responsive, split-screen authentication form component.
 * @param logo - The component to be used as the logo (e.g., an SVG or text).
 * @param title - The main heading for the form.
 * @param description - A short description below the title.
 * @param imageSrc - URL for the image to display on the right panel.
 * @param imageAlt - Alt text for the image for accessibility.
 * @param onSubmit - Async function to handle form submission.
 * @param forgotPasswordHref - URL for the "Forgot Password" link.
 * @param createAccountHref - URL for the "Create Account" link.
 */
export function AuthFormSplitScreen({
  logo,
  title,
  description,
  imageSrc,
  imageAlt,
  onSubmit,
  forgotPasswordHref = "#",
  createAccountHref = "#",
  onCreateAccountClick,
  error,
  children,
  footer,
}: AuthFormSplitScreenProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const handleFormSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants for staggering children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 md:p-6 bg-[#080B10] text-[#F0F4F8]">
      <div className="w-full max-w-md bg-[#0C1018] border border-[#1C2534] rounded-lg p-6 sm:p-8 shadow-2xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
            <motion.div variants={itemVariants} className="mb-2">
              {logo}
            </motion.div>
            <motion.div variants={itemVariants} className="text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-[#F0F4F8]">{title}</h1>
              {description ? <p className="text-sm text-[#94A3B8]">{description}</p> : null}
            </motion.div>

            {error && (
              <motion.div
                variants={itemVariants}
                className="p-3 rounded-md bg-[#1A0E12] border border-[#3D1E22] text-[#F87171] text-xs"
              >
                {error}
              </motion.div>
            )}

            {children ? (
              children
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleFormSubmit)}
                  className="space-y-4"
                >
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#94A3B8]">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="name@example.com"
                              {...field}
                              disabled={isLoading}
                              className="bg-[#0E131C] border-[#1C2534] text-[#F0F4F8] placeholder-[#57657A] focus-visible:ring-[#2E3C52]"
                            />
                          </FormControl>
                          <FormMessage className="text-xs text-rose-400" />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#94A3B8]">Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••••••"
                              {...field}
                              disabled={isLoading}
                              className="bg-[#0E131C] border-[#1C2534] text-[#F0F4F8] placeholder-[#57657A] focus-visible:ring-[#2E3C52]"
                            />
                          </FormControl>
                          <FormMessage className="text-xs text-rose-400" />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-between"
                  >
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isLoading}
                              className="border-[#2E3C52] data-[state=checked]:bg-[#141C28] data-[state=checked]:text-[#F0F4F8]"
                            />
                          </FormControl>
                          <div className="leading-none">
                            <FormLabel className="font-normal text-xs text-[#94A3B8] cursor-pointer">
                              Remember Me
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <a
                      href={forgotPasswordHref}
                      className="text-xs font-medium text-[#94A3B8] hover:text-[#F0F4F8] hover:underline"
                    >
                      Forgotten Password
                    </a>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full bg-[#141C28] hover:bg-[#1A2536] border border-[#232F42] text-[#F0F4F8] text-sm py-2.5 rounded-md transition-colors"
                      disabled={isLoading}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Continue
                    </Button>
                  </motion.div>
                </form>
              </Form>
            )}

            {footer !== undefined ? (
              footer
            ) : (
              <motion.p
                variants={itemVariants}
                className="px-8 text-center text-xs text-[#57657A]"
              >
                Don&apos;t have an account?{" "}
                {onCreateAccountClick ? (
                  <button
                    type="button"
                    onClick={onCreateAccountClick}
                    className="font-medium text-[#94A3B8] hover:text-[#F0F4F8] underline cursor-pointer"
                  >
                    Create one here
                  </button>
                ) : (
                  <a
                    href={createAccountHref}
                    className="font-medium text-[#94A3B8] hover:text-[#F0F4F8] underline"
                  >
                    Create one here
                  </a>
                )}
                .
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }
