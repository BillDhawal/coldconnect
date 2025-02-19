import { auth } from "@clerk/nextjs/server";
import ResumeUploadPage from "@/components/resume-upload-page";
import NavigationBar from "@/components/NavigationBar";

export default async function Home() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  return (
    <main>
      <NavigationBar />
      <ResumeUploadPage />
    </main>
  );
}
