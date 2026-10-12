import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio Management // Valeriy Khlamov",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
