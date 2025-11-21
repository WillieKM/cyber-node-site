import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Your global Tailwind CSS file

// Import the new components from the components directory
import Header from "@/components/header";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cyber-Node | Web Services",
  description: "Modern, secure web development and deployment solutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The body uses flex-col and min-h-screen to ensure the page always takes up at least 
        the full height of the viewport, allowing the footer to be correctly pushed to the bottom 
        by the flex-grow property on the main element.
      */}
      <body className={inter.className + " min-h-screen flex flex-col bg-gray-50"}>
        
        {/* Navigation Bar */}
        <Header />
        
        {/* Main Content Area. 
          flex-grow ensures this section takes up all available vertical space between the header and footer.
        */}
        <main className="flex-grow">
          {children}
        </main>
        
        {/* Footer Content */}
        <Footer />
        
      </body>
    </html>
  );
}