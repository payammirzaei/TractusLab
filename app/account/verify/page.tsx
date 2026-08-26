import { VerifyEmailPanel } from "@/components/VerifyEmailPanel";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <VerifyEmailPanel token={params.token ?? ""} />;
}
