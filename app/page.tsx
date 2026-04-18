import { auth } from "@/auth";
import { LandingPage } from "@/components/landing/landing-page";

export default async function Home() {
  const session = await auth();

  return <LandingPage isAuthenticated={Boolean(session?.user)} />;
}
