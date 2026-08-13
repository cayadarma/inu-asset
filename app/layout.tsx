import "./globals.css";
import { Poppins } from "next/font/google";
import DashboardLayout from "../components/layout/DashboardLayout";

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "INU Asset - Sistem Manajemen Aset",
  description: "Tracking dan Maintenance Aset Perusahaan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </body>
    </html>
  );
}