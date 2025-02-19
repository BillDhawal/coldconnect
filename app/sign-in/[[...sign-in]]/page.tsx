"use client";

import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignInPage() {
  const router = useRouter();
  const { isLoaded, signIn } = useSignIn();

  useEffect(() => {
    if (isLoaded && signIn && signIn.status === "complete") {
      router.push("/");
    }
  }, [isLoaded, signIn, router]);

  return (
    <div className="flex justify-center">
      <SignIn />
    </div>
  );
}
