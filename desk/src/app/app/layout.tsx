import { DemoProvider } from "@/lib/store";
import { Sidebar } from "@/components/app/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <div className="md:flex">
        <Sidebar />
        <main id="app-main" className="min-w-0 flex-1 px-5 pb-16 pt-6 md:px-10 md:pt-9">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </DemoProvider>
  );
}
