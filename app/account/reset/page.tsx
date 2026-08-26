import { ResetPasswordPanel } from "@/components/ResetPasswordPanel";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <ResetPasswordPanel token={params.token ?? ""} />;
}
