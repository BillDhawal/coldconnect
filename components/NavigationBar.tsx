"use client";

import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";

export default function NavigationBar() {
  return (
    <nav className="bg-blue-600 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-white">ColdConnect</h1>
          <h3 className="text-xl text-white">Easy Cold Email</h3>
        </div>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal" />
          </SignedOut>
          <SignedIn>
            <UserButton
              showName
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-12 h-12", // Increase avatar size
                  userButtonText: "text-lg font-bold text-green", // Increase text size and style
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
