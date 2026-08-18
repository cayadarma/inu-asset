import "./globals.css";
import { Poppins } from "next/font/google";
import DashboardLayout from "../components/layout/DashboardLayout";
import { ThemeProvider } from "../context/ThemeContext"; // 1. Import

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        {/* 2. Bungkus di sini */}
        <ThemeProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}