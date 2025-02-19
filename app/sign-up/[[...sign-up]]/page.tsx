"use client";

import { SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();

  useEffect(() => {
    if (isLoaded && signUp && signUp.status === "complete") {
      router.push("/");
    }
  }, [isLoaded, signUp, router]);

  return (
    <div className="flex justify-center">
      <SignUp />
    </div>
  );
}
