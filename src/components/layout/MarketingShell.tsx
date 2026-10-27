import Nav from "@/components/layout/Nav";
import S11Footer from "@/components/sections/S11Footer";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <S11Footer />
    </>
  );
}
