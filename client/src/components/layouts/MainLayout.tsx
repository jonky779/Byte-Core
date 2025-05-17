import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <Sidebar />
      <main className="flex-grow overflow-hidden flex flex-col bg-background">
        <TopBar title={title} />
        <div className="flex-grow overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
